import config from "../config";
import {integralClosingLevel, integralDriveGain, labControl, nextIntegral} from "./labController";
import {proportionalIntakePosition} from "./controller";
import {labMeasurements, labPassed} from "./labMeasurements";
import {createModel, drainPosition, intakePosition, modelFlows, modelReducer, RESET, RUN, SET_INPUT, SET_STATUS, TICK} from "./reducer";
import {createDrainSchedule} from "./schedule";
import {labDrain} from "../labConfig";

const run = (model, steps = config.evaluation[model.mode].duration / config.simulation.step) => {
    let result = modelReducer(model, {type: SET_STATUS, status: RUN});
    for (let i = 0; i < steps; i++) result = modelReducer(result, {type: TICK});
    return result;
};

test("I-only holds its opening at zero error and does not depend on Kp", () => {
    const model = {...createModel("labI"), level: 0.5, integralOutput: 0.42, kp: 100};
    expect(intakePosition(model)).toBeCloseTo(42);
    expect(nextIntegral(model, "integral", 0.5, 0.1)).toBe(0.42);
    expect(labControl({...model, level: 0.3}, "integral").p).toBe(0);
    expect(nextIntegral(model, "integral", 0.4, 0.1)).toBeGreaterThan(0.42);
    expect(nextIntegral(model, "integral", 0.6, 0.1)).toBeLessThan(0.42);
});

test("PI has independent P and I gains and recovers from actuator saturation", () => {
    const model = {...createModel("labPI"), kp: 4, ki: 0.5, level: 0.4, integralOutput: 0.2};
    expect(intakePosition(model)).toBeCloseTo(60);
    expect(nextIntegral(model, "parallelPI", 0.4, 0.1)).toBeCloseTo(nextIntegral({...model, kp: 2}, "parallelPI", 0.4, 0.1));
    expect(nextIntegral({...model, integralOutput: 0.9}, "parallelPI", 0.4, 0.1)).toBe(0.9);
    expect(nextIntegral({...model, integralOutput: 0.9}, "parallelPI", 0.6, 0.1)).toBeLessThan(0.9);
    expect(nextIntegral({...model, integralOutput: 0}, "parallelPI", 0.6, 0.1)).toBe(0);
});

test("research disturbance steps at exactly 30 s and resets reproducibly", () => {
    let model = {...createModel("labPLoad"), scenario: "step"};
    expect(drainPosition({...model, step: 299})).toBe(12);
    expect(drainPosition({...model, step: 300})).toBe(36);
    model = run(model, 310);
    expect(modelReducer(model, {type: SET_INPUT, name: "scenario", value: "low"})).toBe(model);
    const reset = modelReducer(model, {type: SET_STATUS, status: RESET});
    expect(reset.scenario).toBe("step");
    expect(drainPosition(reset)).toBe(12);
    expect(reset.history.level).toEqual([[0, 0.5]]);
    expect(createModel("labPI", 1).schedule).toEqual(createModel("labPI", 999).schedule);
});

test("reset clears the learned I output while preserving the chosen Ki", () => {
    const model = run({...createModel("labI"), ki: 2}, 100);
    expect(model.integralOutput).not.toBe(0.34);
    const reset = modelReducer(model, {type: SET_STATUS, status: RESET});
    expect(reset.integralOutput).toBe(0.34);
    expect(reset.ki).toBe(2);
    expect(reset.history.controlI).toEqual([]);
});

test("P responds faster with larger gain, and a larger drain leaves a larger offset", () => {
    const lowGain = labMeasurements(run({...createModel("labP"), kp: 1}));
    const highGain = labMeasurements(run({...createModel("labP"), kp: 8}));
    expect(highGain.t63).toBeLessThan(lowGain.t63);
    const light = labMeasurements(run({...createModel("labPLoad"), kp: 4, h0: 0.5, scenario: "low"}));
    const heavy = labMeasurements(run({...createModel("labPLoad"), kp: 4, h0: 0.5, scenario: "high"}));
    expect(heavy.error).toBeGreaterThan(light.error);
    expect(light.error).toBeGreaterThan(0);
});

test("student P modes close the valve at the reference, so the offset shrinks with Kp", () => {
    for (const mode of ["labP", "labPLoad"]) {
        const model = createModel(mode);
        expect(model.h0).toBe(model.referenceLevel);
        expect(intakePosition({...model, level: model.referenceLevel - 0.1, kp: 3})).toBeCloseTo(30);
    }
    const offsets = [1, 2, 4, 8].map((kp) => labMeasurements(run({...createModel("labP"), kp})).error);
    offsets.forEach((offset, i) => {
        expect(offset).toBeGreaterThan(0);
        if (i) expect(offset).toBeLessThan(offsets[i - 1]);
    });
});

test("grade 7 measures the P time constant without valve saturation", () => {
    const {area} = config.tank, {flowMax} = config.intake;
    for (const scenario of ["low", "high"]) {
        for (const kp of [1, 2, 5, 10]) {
            const result = run({...createModel("labP"), kp, scenario});
            const {steadyLevel, t63} = labMeasurements(result);
            const drain = modelFlows({...result, level: steadyLevel}).drain;
            //Linearised loop: A dh/dt = -(Qmax kp + dQdrain/dh) Δh
            expect(t63).toBeCloseTo(area / (flowMax * kp + drain / (2 * steadyLevel)), 0);
            expect(result.history.valve.every(([, v]) => v < 100)).toBe(true);
        }
    }
    expect(createModel("labP").scenario).toBe("low");
});

test("the final PI exercise has attainable criteria and rejects a poor setting", () => {
    const good = run({...createModel("labPI"), kp: 8, ki: 0.5});
    const poor = run({...createModel("labPI"), kp: 1, ki: 0.05});
    expect(labPassed(good)).toBe(true);
    expect(labPassed(poor)).toBe(false);
    expect(labPassed(createModel("labPI"))).toBe(null);
});

test("I experiments show oscillation with higher Ki without numerical blow-up", () => {
    for (const ki of [0.1, 0.5, 2]) {
        const result = run({...createModel("labI"), ki});
        const measurements = labMeasurements(result);
        expect(measurements.overshoot).toBeGreaterThan(0.01);
        expect(result.history.level.every(([, h]) => h > 0 && h < 1)).toBe(true);
    }
});

test("mechanical carriage reproduces PI output and its speed compensates for Kp", () => {
    for (const kp of [1, 4, 10]) {
        for (const level of [0.2, 0.5, 0.8]) {
            const model = {...createModel("labPI"), kp, ki: 0.5, level};
            const h0 = integralClosingLevel(model);
            expect(proportionalIntakePosition(level, kp, h0)).toBeCloseTo(intakePosition(model));
            expect(integralDriveGain(model, "parallelPI") * kp).toBeCloseTo(model.ki);
        }
    }
    const model = {...createModel("labPI"), kp: 4, ki: 0.5, level: 0.45};
    const moved = {...model, integralOutput: nextIntegral(model, "parallelPI", model.level, 0.1)};
    expect((integralClosingLevel(moved) - integralClosingLevel(model)) / 0.1)
        .toBeCloseTo(integralDriveGain(model, "parallelPI") * (model.referenceLevel - model.level));
});

test("mechanical I respects valve stops and PI respects carriage travel", () => {
    const direct = {...createModel("labI"), ki: 3, integralOutput: 0.99};
    expect(nextIntegral(direct, "integral", 0, 0.1)).toBe(1);
    expect(nextIntegral({...direct, integralOutput: 0.01}, "integral", 1, 0.1)).toBe(0);
    const pi = {...createModel("labPI"), kp: 1, ki: 3, integralOutput: 0.49};
    const result = {...pi, integralOutput: nextIntegral(pi, "parallelPI", 0.3, 1)};
    expect(integralClosingLevel(result)).toBe(config.controller.h0Limits[1]);
});

test("student modes share one drain; random changes are repeatable and end with a settling interval", () => {
    for (const mode of ["labManual", "labPI"]) {
        const model = createModel(mode, 1);
        expect(config.evaluation[mode].consumers).toBe(false);
        expect(config.evaluation[mode].drainValve).toBe(true);
        expect(modelFlows(model).consumersTotal).toBe(0);
        expect(drainPosition(model)).toBe(24);
        expect(model.drainSchedule).toEqual(createModel(mode, 999).drainSchedule);
        const end = config.evaluation[mode].duration / config.simulation.step;
        expect(model.drainSchedule.at(-1)[0]).toBeLessThanOrEqual(end - labDrain.settlingSeconds / config.simulation.step);
        for (const [i, [step, opening]] of model.drainSchedule.entries()) {
            expect(labDrain.openings).toContain(opening);
            expect(drainPosition({...model, step})).toBe(opening);
            if (i) {
                expect(drainPosition({...model, step: step - 1})).toBe(model.drainSchedule[i - 1][1]);
                expect(opening).not.toBe(model.drainSchedule[i - 1][1]);
            }
        }
        const result = run(model);
        expect(result.supply.onSteps).toBe(end);
        const reset = modelReducer(result, {type: SET_STATUS, status: RESET});
        expect(reset.drainSchedule).toEqual(model.drainSchedule);
        expect(reset.supply.onSteps).toBe(0);
    }
    expect(createDrainSchedule(7, 1200)).not.toEqual(createDrainSchedule(2024, 1200));
});

test("random drain works in I research and resets the measurement segment at a change", () => {
    const model = {...createModel("labI"), scenario: "random"};
    expect(drainPosition({...model, step: 119})).toBe(24);
    expect(drainPosition({...model, step: 120})).toBe(36);
    const changed = run(model, 120);
    expect(changed.history.drainValve.at(-1)).toEqual([12, 36]);
    expect(labMeasurements(changed).enough).toBe(false);
    expect(labMeasurements(run(model, 220)).enough).toBe(true);
});

test.each([4, 6, 8])("recommended PI area works for Kp=%s on the classroom disturbance", (kp) => {
    for (const ki of [0.3, 0.5, 1]) {
        const result = run({...createModel("labPI"), kp, ki});
        expect(labPassed(result)).toBe(true);
        expect(result.history.level.every(([, h]) => h > 0.46 && h < 0.54)).toBe(true);
        expect(result.history.valve.every(([, v]) => v > 0 && v < 100)).toBe(true);
    }
});
