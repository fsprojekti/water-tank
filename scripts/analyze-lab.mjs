import {mkdir, writeFile} from "node:fs/promises";
import {createServer} from "vite";

//Run the actual application reducer, including actuator/carriage limits and the seeded disturbance.
const server = await createServer({server: {middlewareMode: true}, appType: "custom"});
try {
    const {default: config} = await server.ssrLoadModule("/src/config.js");
    const {createModel, modelReducer, modelFlows, SET_STATUS, RUN, TICK} =
        await server.ssrLoadModule("/src/simulation/reducer.js");
    const {labMeasurements, labPassed} = await server.ssrLoadModule("/src/simulation/labMeasurements.js");
    const rows = [];
    const simulate = (mode, settings = {}, manual = false) => {
        let model = {...createModel(mode), ...settings};
        model = modelReducer(model, {type: SET_STATUS, status: RUN});
        const duration = config.evaluation[mode].duration;
        for (let step = 0; step < duration / config.simulation.step; step++) {
            //A benchmark, not a claim about human performance: observe the changed drain after 2 s,
            //then adjust every 2 s using nominal flow and level error. No controller added to the UI.
            if (manual && step % 20 === 0) {
                const delayed = {...model, step: Math.max(0, step - 20), level: model.referenceLevel};
                const nominal = modelFlows(delayed).drain / config.intake.flowMax;
                model.inValvePos = Math.max(0, Math.min(100, (nominal + 2 * (model.referenceLevel - model.level)) * 100));
            }
            model = modelReducer(model, {type: TICK});
        }
        const m = labMeasurements(model);
        const levels = model.history.level.map(([, h]) => h);
        const crossings = model.history.level.filter(([, h], i, a) => i > 0 &&
            (h - model.referenceLevel) * (a[i - 1][1] - model.referenceLevel) < 0).length;
        const row = {mode, scenario: config.evaluation[mode].randomDrain ? "random" : model.scenario,
            kp: mode === "labI" || mode === "labManual" ? "" : model.kp,
            ki: ["labI", "labPI"].includes(mode) ? model.ki : "",
            h0: model.h0 ?? "", manual: manual ? "delayed_2s" : "",
            iae: model.iae, min: Math.min(...levels), max: Math.max(...levels),
            meanError10s: m.error, range10s: m.range, t63: m.t63 ?? "", crossings,
            saturationPercent: 100 * model.history.valve.filter(([, v]) => v <= 0 || v >= 100).length /
                model.history.valve.length,
            supplyPercent: m.supply === null ? "" : 100 * m.supply, passed: labPassed(model) ?? ""};
        rows.push(row);
        return row;
    };
    for (const scenario of ["low", "medium", "high"]) {
        for (const kp of [1, 2, 4, 8]) {
            for (const h0 of [0.5, 0.6, 0.65]) simulate("labP", {scenario, kp, h0});
        }
    }
    for (const scenario of ["low", "medium", "high", "step", "random"]) {
        for (const ki of [0.05, 0.1, 0.2, 0.5, 1, 2, 3]) simulate("labI", {scenario, ki});
    }
    for (const kp of [1, 2, 3, 4, 5, 6, 8, 10]) {
        for (const ki of [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 3]) simulate("labPI", {kp, ki});
    }
    simulate("labManual", {inValvePos: 42});
    simulate("labManual", {}, true);
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => typeof r[k] === "number"
        ? Number(r[k].toFixed(6)) : r[k]).join(","))].join("\n") + "\n";
    await mkdir("analysis", {recursive: true});
    await writeFile("analysis/lab-sweep.csv", csv);
    console.log(JSON.stringify({runs: rows.length,
        drainSchedule: createModel("labPI").drainSchedule.map(([s, p]) => [s * config.simulation.step, p]),
        integral: rows.filter((r) => r.mode === "labI" && r.scenario === "medium"),
        pi: rows.filter((r) => r.mode === "labPI" && [1, 4, 6, 8].includes(r.kp) && [0.05, 0.2, 0.5, 2].includes(r.ki)),
        manual: rows.filter((r) => r.mode === "labManual")}, null, 2));
} finally {
    await server.close();
}
