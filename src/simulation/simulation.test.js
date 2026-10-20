import config from "../config";
import {consumerFlow, consumerFlows, drainFlow, ERROR, intakeFlow, nextLevel, OK, supplyStatus, WARNING} from "./model";
import {consumerStates, createSchedule} from "./schedule";
import {steadyState, steadyWindowS, targetReachedAt, timeConstant} from "./measurements";
import {governorValvePosition, mechanicalIntakePosition} from "./linkage";
import {
    createModel, isFinished, MANUAL, MECHANICAL, modelFlows, modelReducer, modelTime, OPERATOR,
    RESET, RUN, SET_INPUT, SET_STATUS, STOP, supplyRatio, TANK, TICK, TUNING,
} from "./reducer";

//Run fn with config section[key] temporarily set to value
const withConfig = (section, key, value, fn) => {
    const previous = section[key];
    section[key] = value;
    try {
        fn();
    } finally {
        section[key] = previous;
    }
};

const run = (model, ticks) => {
    let m = modelReducer(model, {type: SET_STATUS, status: RUN});
    for (let i = 0; i < ticks; i++) m = modelReducer(m, {type: TICK});
    return m;
};

describe("model", () => {
    test("intake flow scales with valve opening", () => {
        expect(intakeFlow(0)).toBe(0);
        expect(intakeFlow(50)).toBeCloseTo(config.intake.flowMax / 2);
        expect(intakeFlow(150)).toBeCloseTo(config.intake.flowMax);
    });

    test("drain flow follows Torricelli", () => {
        expect(drainFlow(0, 100)).toBe(0);
        expect(drainFlow(0.5, 0)).toBe(0);
        expect(drainFlow(0.8, 100) / drainFlow(0.2, 100)).toBeCloseTo(2);
    });

    test("level is clamped to tank", () => {
        expect(nextLevel(0, 0, 1)).toBe(0);
        expect(nextLevel(config.tank.height, 1, 0)).toBe(config.tank.height);
        expect(nextLevel(0.5, 0.001, 0, 0.1)).toBeCloseTo(0.501);
    });
});

describe("consumers", () => {
    const {list, onSeconds, offSeconds} = config.consumers;
    const dt = config.simulation.step;

    test("flow scales with pipe cross-section", () => {
        expect(consumerFlow(0.5, 20) / consumerFlow(0.5, 10)).toBeCloseTo(4);
        expect(consumerFlow(0, 18)).toBe(0);
    });

    test("off consumers draw the idle share of their flow, disabled ones nothing", () => withConfig(config.consumers, "idleFlowRatio", 0.3, () => {
        const states = list.map((_, i) => i === 0);
        const enabled = list.map((_, i) => i !== 4);
        const flows = consumerFlows(0.5, states, enabled);
        expect(flows[0]).toBeCloseTo(consumerFlow(0.5, list[0].diameterMm));
        expect(flows[1]).toBeCloseTo(consumerFlow(0.5, list[1].diameterMm) * 0.3);
        expect(flows[4]).toBe(0);
    }));

    test("all consumers together stay below the intake capacity at the reference", () => {
        const total = consumerFlows(0.75, list.map(() => true)).reduce((a, b) => a + b);
        expect(total).toBeLessThan(config.intake.flowMax);
    });

    test("schedule is reproducible for a seed", () => {
        const schedule = createSchedule(7, 1200);
        expect(createSchedule(7, 1200)).toEqual(schedule);
        expect(createSchedule(8, 1200)).not.toEqual(schedule);
    });

    test("demand stays in range and drops to zero only briefly", () => {
        const {demand} = config.consumers;
        const schedule = createSchedule(7, 1200);
        const areas = list.map((consumer) => consumer.diameterMm ** 2);
        const total = areas.reduce((a, b) => a + b);
        let zeroRun = 0;
        let changes = 0;
        let previous = null;
        for (let step = 0; step < 1200; step++) {
            const states = consumerStates(schedule, step);
            const share = states.reduce((sum, on, i) => sum + (on ? areas[i] / total : 0), 0);
            zeroRun = share === 0 ? zeroRun + 1 : 0;
            expect(zeroRun * dt).toBeLessThanOrEqual(demand.dropSeconds[1] + 1e-9);
            if (share > 0) {
                expect(share).toBeGreaterThan(demand.range[0] - 0.06);
                expect(share).toBeLessThan(demand.range[1] + 0.06);
            }
            if (previous !== null && share !== previous) changes++;
            previous = share;
        }
        //Wild: demand changes every few seconds
        expect(changes).toBeGreaterThan(120 / demand.holdSeconds[1] / 2);
    });

    test("bursts switch several consumers on together for a short time", () => withConfig(config.consumers, "pattern", "bursts", () => {
        const {burst} = config.consumers;
        const schedule = createSchedule(7, 1200);
        schedule.forEach((intervals) => intervals.forEach(([on, off], i) => {
            expect((off - on) * dt).toBeLessThanOrEqual(burst.onSeconds[1] + 1e-9);
            expect((off - on) * dt).toBeGreaterThanOrEqual(burst.onSeconds[0] - 2 * burst.jitterSeconds - 1e-9);
            if (i > 0) expect(on).toBeGreaterThanOrEqual(intervals[i - 1][1]);
        }));
        const maxTogether = Math.max(...Array.from({length: 1200}, (_, step) =>
            consumerStates(schedule, step).filter(Boolean).length));
        expect(maxTogether).toBeGreaterThanOrEqual(burst.consumers[0]);
    }));

    test("independent pattern respects on/off durations", () => withConfig(config.consumers, "pattern", "independent", () => {
        createSchedule(7, 1200).forEach((intervals) => intervals.forEach(([on, off], i) => {
            expect((off - on) * dt).toBeGreaterThanOrEqual(onSeconds[0] - 1e-9);
            expect((off - on) * dt).toBeLessThanOrEqual(onSeconds[1] + 1e-9);
            if (i > 0) expect((on - intervals[i - 1][1]) * dt).toBeGreaterThanOrEqual(offSeconds[0] - 1e-9);
        }));
    }));

    test("supply status follows flow deviation from nominal", () => {
        const {ok, warning} = config.consumers.tolerance;
        const nominal = 0.001;
        const at = (deviation) => supplyStatus(nominal * (1 + deviation), nominal);
        expect(at(0)).toBe(OK);
        expect(at(-ok * 0.9)).toBe(OK);
        expect(at(-(ok + warning) / 2)).toBe(WARNING);
        expect(at((ok + warning) / 2)).toBe(WARNING);
        expect(at(-warning * 1.1)).toBe(ERROR);
        expect(at(warning * 1.1)).toBe(ERROR);
    });

    test("states follow the schedule", () => {
        const schedule = [[[10, 20]], []];
        expect(consumerStates(schedule, 9)).toEqual([false, false]);
        expect(consumerStates(schedule, 10)).toEqual([true, false]);
        expect(consumerStates(schedule, 20)).toEqual([false, false]);
    });
});

describe("tank model", () => {
    const fill = (inputs, seconds) => {
        let model = createModel(TANK);
        for (const [name, value] of Object.entries(inputs)) model = modelReducer(model, {type: SET_INPUT, name, value});
        return run(model, seconds / config.simulation.step);
    };

    test("has no consumers", () => {
        const model = fill({inValvePos: 0}, 1);
        expect(model.consumersEnabled.every((enabled) => !enabled)).toBe(true);
        expect(modelFlows({...model, level: 0.5}).consumersTotal).toBe(0);
    });

    test("fill time without drain matches A·h / Q", () => {
        const {referenceLevel} = config.evaluation[TANK];
        const model = fill({inValvePos: 100}, 20);
        const expected = config.tank.area * referenceLevel / config.intake.flowMax;
        expect(targetReachedAt(model.history.level, referenceLevel)).toBeCloseTo(expected, 0);
    });

    test("open drain reaches a steady state where intake equals outflow", () => {
        const model = fill({inValvePos: 50, outValvePos: 50}, 100);
        const steady = steadyState(model.history.level);
        expect(steady).not.toBe(null);
        const flows = modelFlows({...model, level: steady.level});
        expect(flows.drain).toBeCloseTo(flows.flowIn, 4);
    });

    test("start level applies before the run and survives reset", () => {
        let model = modelReducer(createModel(TANK), {type: SET_INPUT, name: "initialLevel", value: 0.75});
        expect(model.level).toBe(0.75);
        model = run(modelReducer(model, {type: SET_INPUT, name: "outValvePos", value: 100}), 10);
        expect(model.level).toBeLessThan(0.75);
        model = modelReducer(model, {type: SET_INPUT, name: "initialLevel", value: 0.25});
        expect(model.initialLevel).toBe(0.25);
        expect(model.level).toBeLessThan(0.75);
        expect(modelReducer(model, {type: SET_STATUS, status: RESET}).level).toBe(0.25);
    });
});

describe("mechanical tuning", () => {
    test("rods set the steady level of the unloaded tank", () => {
        let model = createModel(TUNING);
        expect(model.consumersEnabled.every((enabled) => !enabled)).toBe(true);
        model = modelReducer(model, {type: SET_INPUT, name: "l3", value: 1});
        model = modelReducer(model, {type: SET_INPUT, name: "l4", value: 1});
        model = run(model, 400);
        const response = timeConstant(model.history.level);
        expect(response.steady.level).toBeCloseTo(0.5, 1);
        expect(response.t63).toBeGreaterThan(0);
        //No drain, no consumers: the level settles where the intake valve closes
        expect(modelFlows(model).flowIn).toBeCloseTo(0, 5);
    });
});

describe("measurements", () => {
    const series = (values, dt = 0.1) => values.map((value, i) => [Number((i * dt).toFixed(6)), value]);

    test("target reached when filling or draining", () => {
        expect(targetReachedAt(series([0, 0.4, 0.8]), 0.75)).toBe(0.2);
        expect(targetReachedAt(series([1, 0.9, 0.7]), 0.75)).toBe(0.2);
        expect(targetReachedAt(series([0, 0.4]), 0.75)).toBe(null);
    });

    test("time constant of a first-order response", () => {
        //h(t) = 0.5 (1 - e^(-t/4)) sampled every 0.1 s for 60 s
        const response = Array.from({length: 601}, (_, i) => [Number((i * 0.1).toFixed(6)), 0.5 * (1 - Math.exp(-i * 0.1 / 4))]);
        const result = timeConstant(response);
        expect(result.steady.level).toBeCloseTo(0.5, 2);
        expect(result.t63).toBeCloseTo(4, 0);
        expect(timeConstant(response.slice(0, 50))).toBe(null);
    });

    test("steady state is the current quiet level", () => {
        const quiet = (value) => Array(steadyWindowS * 10 + 1).fill(value);
        expect(steadyState(series([0.1, 0.3, ...quiet(0.5)]))).toEqual({time: 0.2, level: 0.5});
        //Settled once, then moving again: not steady any more
        expect(steadyState(series([...quiet(0.5), 0.6, 0.7]))).toBe(null);
        //Settled again at a new level
        expect(steadyState(series([...quiet(0.5), 0.6, ...quiet(0.7)]))?.level).toBe(0.7);
        expect(steadyState(series([0.1, 0.2, 0.3, 0.4]))).toBe(null);
    });
});

describe("linkage", () => {
    test("governor maps closed/open positions to 0/100 %", () => {
        expect(governorValvePosition(config.controller.governorClosedPx)).toBe(0);
        expect(governorValvePosition(config.controller.governorOpenPx)).toBe(100);
        expect(governorValvePosition(150)).toBe(50);
    });

    test("rising level closes the intake valve", () => {
        const positions = [0.3, 0.5, 0.7].map((level) => mechanicalIntakePosition(level, 0.85, 1));
        expect(positions[0]).toBeGreaterThan(positions[1]);
        expect(positions[1]).toBeGreaterThan(positions[2]);
    });

    test("pontoon hangs on the rods above an empty tank and keeps the valve open", () => {
        expect(mechanicalIntakePosition(0, 0.85, 1)).toBe(100);
    });

    test("unreachable linkage closes the valve", () => {
        expect(mechanicalIntakePosition(0.5, 0.5, 0.5)).toBe(0);
    });
});

describe("reducer", () => {
    test("ticks only while running", () => {
        const model = createModel(MANUAL);
        expect(modelReducer(model, {type: TICK})).toBe(model);
        expect(run(model, 3).step).toBe(3);
    });

    test("time has no floating point drift and every tick is recorded", () => {
        const model = run(createModel(MANUAL), 3);
        expect(modelTime(model)).toBe(0.3);
        expect(model.history.level.map(([t]) => t)).toEqual([0, 0.1, 0.2, 0.3]);
    });

    test("error is integrated over time", () => {
        const dt = config.simulation.step;
        const {referenceLevel} = config.evaluation[MANUAL];
        const model = run(createModel(MANUAL), 10);
        expect(model.iae).toBeCloseTo(10 * referenceLevel * dt);
    });

    test("fills tank with intake open", () => {
        const model = modelReducer(createModel(MANUAL), {type: SET_INPUT, name: "inValvePos", value: 100});
        const dt = config.simulation.step;
        expect(run(model, 1).level).toBeCloseTo(config.intake.flowMax * dt / config.tank.area);
    });

    test("stops at evaluation duration and refuses to run again", () => {
        const {duration} = config.evaluation[MECHANICAL];
        const model = run(createModel(MECHANICAL), duration / config.simulation.step + 5);
        expect(isFinished(model)).toBe(true);
        expect(model.status).toBe(STOP);
        expect(modelTime(model)).toBe(duration);
        expect(modelReducer(model, {type: SET_STATUS, status: RUN})).toBe(model);
    });

    test("consumers drain the tank", () => {
        let model = {...createModel(MANUAL), level: 0.5, schedule: config.consumers.list.map(() => [[0, 10]])};
        const flows = modelFlows(model);
        expect(flows.flowOut).toBeCloseTo(flows.consumersTotal);
        model = run(model, 1);
        expect(model.level).toBeCloseTo(0.5 - flows.consumersTotal * config.simulation.step / config.tank.area);
        expect(model.history.consumers[1][1]).toBeCloseTo(flows.consumersTotal);
    });

    test("consumers are supplied ok only near the reference level", () => {
        const allOn = (level) => modelFlows({
            ...createModel(MANUAL), level, schedule: config.consumers.list.map(() => [[0, 10]]),
        }).supply;
        const {referenceLevel} = config.evaluation[MANUAL];
        const {ok, warning} = config.consumers.tolerance;
        //Flow follows √h, so a flow deviation d needs a level of (1 - d)² times the reference
        expect(allOn(referenceLevel).every((s) => s === OK)).toBe(true);
        expect(allOn(referenceLevel * (1 - (ok + warning) / 2) ** 2).every((s) => s === WARNING)).toBe(true);
        expect(allOn(referenceLevel * 0.5).every((s) => s === ERROR)).toBe(true);
        expect(modelFlows({...createModel(MANUAL), schedule: [[], [], [], [], []]}).supply.every((s) => s === null))
            .toBe(true);
    });

    test("disabled consumers stay off and the setting survives reset", () => {
        let model = {...createModel(MANUAL), level: 0.5, schedule: config.consumers.list.map(() => [[0, 10]])};
        model = modelReducer(model, {type: SET_INPUT, name: "consumersEnabled", value: [false, true, false, true, false]});
        expect(modelFlows(model).states).toEqual([false, true, false, true, false]);
        expect(modelFlows(model).supply[0]).toBe(null);
        model = modelReducer(model, {type: SET_STATUS, status: RESET, seed: 3});
        expect(model.consumersEnabled).toEqual([false, true, false, true, false]);
    });

    test("operator run starts at the reference level", () => {
        const model = createModel(OPERATOR);
        expect(model.level).toBe(config.evaluation[OPERATOR].initialLevel);
        expect(model.history.level).toEqual([[0, model.level]]);
        expect(modelReducer(run(model, 5), {type: SET_STATUS, status: RESET}).level).toBe(model.level);
    });

    test("supply ratio counts running consumers in the green or orange band", () => {
        const schedule = config.consumers.list.map((_, i) => (i < 2 ? [[0, 100]] : []));
        //Level at the reference: both running consumers ok
        let model = {...createModel(OPERATOR), schedule};
        expect(supplyRatio(model)).toBe(null);
        model = run(model, 1);
        expect(model.supply).toEqual({onSteps: 2, okSteps: 2});
        expect(model.history.deviation[1][1]).toBeCloseTo(config.evaluation[OPERATOR].referenceLevel - model.level);
        //Level far below the reference: both running consumers in error
        model = run({...model, level: 0.2}, 1);
        expect(model.supply).toEqual({onSteps: 4, okSteps: 2});
        expect(supplyRatio(model)).toBe(0.5);
        //Level slightly off the reference: orange counts too
        const {ok, warning} = config.consumers.tolerance;
        const referenceLevel = config.evaluation[OPERATOR].referenceLevel;
        model = run({...model, level: referenceLevel * (1 - (ok + warning) / 2) ** 2}, 1);
        expect(model.supply).toEqual({onSteps: 6, okSteps: 4});
    });

    test("reset draws a new consumer pattern from the given seed", () => {
        const model = modelReducer(createModel(MANUAL, 1), {type: SET_STATUS, status: RESET, seed: 2});
        expect(model.seed).toBe(2);
        expect(model.schedule).toEqual(createModel(MANUAL, 2).schedule);
    });

    test("reset clears the run but keeps inputs", () => {
        let model = modelReducer(createModel(MANUAL), {type: SET_INPUT, name: "inValvePos", value: 40});
        model = run(model, 20);
        model = modelReducer(model, {type: SET_STATUS, status: RESET});
        expect(model).toMatchObject({status: RESET, step: 0, level: 0, iae: 0, inValvePos: 40});
        expect(model.history.level).toEqual([[0, 0]]);
    });
});
