import config from "../config";
import {clamp, consumerFlow, consumerFlows, drainFlow, ERROR, intakeFlow, nextLevel, supplyStatus} from "./model";
import {proportionalIntakePosition} from "./controller";
import {consumerStates, createSchedule, nextSeed} from "./schedule";

export const MANUAL = "manual";
export const MECHANICAL = "mechanical";
export const OPERATOR = "operator";
export const TANK = "tank";
export const TUNING = "tuning";
export const LOAD = "load";
export const PI = "pi";

//Pages where the rack and pinion controller drives the intake valve
export const isMechanical = (mode) => config.evaluation[mode].controller === "mechanical";

export const RUN = "RUN";
export const STOP = "STOP";
export const RESET = "RESET";

export const TICK = "TICK";
export const SET_STATUS = "SET_STATUS";
export const SET_INPUT = "SET_INPUT";

const sum = (values) => values.reduce((a, b) => a + b, 0);

const totalSteps = (mode) => Math.round(config.evaluation[mode].duration / config.simulation.step);

//Integer step counter avoids floating point drift in time
export const modelTime = (model) => Number((model.step * config.simulation.step).toFixed(6));

export const isFinished = (model) => model.step >= totalSteps(model.mode);

//Share of consumer on time with ok or warning (green or orange) supply, null before any consumer ran
export const supplyRatio = (model) => (model.supply.onSteps > 0 ? model.supply.okSteps / model.supply.onSteps : null);

//Intake valve opening [%]
export const intakePosition = (model) => isMechanical(model.mode)
    ? proportionalIntakePosition(model.level, model.kp, model.h0)
    : model.inValvePos;

//All flows [m³/s] at the current step
export const modelFlows = (model) => {
    const inValvePos = intakePosition(model);
    //Disabled consumers never switch on
    const states = consumerStates(model.schedule, model.step).map((on, i) => on && model.consumersEnabled[i]);
    const consumers = consumerFlows(model.level, states, model.consumersEnabled);
    const drain = drainFlow(model.level, model.outValvePos);
    const consumersTotal = sum(consumers);
    //Nominal consumer flow is the flow at the reference level
    const nominal = config.consumers.list.map((consumer) => consumerFlow(model.referenceLevel, consumer.diameterMm));
    return {
        inValvePos,
        flowIn: intakeFlow(inValvePos),
        drain,
        states,
        consumers,
        nominal,
        //Supply status of running consumers, null when off
        supply: consumers.map((flow, i) => (states[i] ? supplyStatus(flow, nominal[i]) : null)),
        consumersTotal,
        flowOut: drain + consumersTotal,
    };
};

//New run from the start level [m] towards the reference [m]
const freshRun = (mode, seed, level, reference) => {
    return {
        seed,
        schedule: createSchedule(seed, totalSteps(mode)),
        step: 0,
        level,
        //Integral of absolute error [m·s]
        iae: 0,
        //Consumer steps running and running with ok or warning (green or orange) supply
        supply: {onSteps: 0, okSteps: 0},
        //Chart series as [time, value] pairs; flows start at zero
        history: {
            level: [[0, level]],
            error: [[0, 0]],
            flowIn: [[0, 0]],
            drain: [[0, 0]],
            consumers: [[0, 0]],
            //Level error h_ref - h [m]
            deviation: [[0, reference - level]],
            //Closing level h0 moved by the turbine [m]
            setLevel: [],
        },
    };
};

export const createModel = (mode, seed = nextSeed()) => {
    const {referenceLevel, startAtReference = false, consumers = true} = config.evaluation[mode];
    const initialLevel = startAtReference ? referenceLevel : config.evaluation[mode].initialLevel ?? 0;
    return {
        mode,
        status: STOP,
        outValvePos: 0,
        //A page without consumers keeps them all disabled
        consumersEnabled: config.consumers.list.map(() => consumers),
        //Level a run starts from and the reference it aims at [m]
        initialLevel,
        referenceLevel,
        ...(isMechanical(mode)
            ? {kp: config.controller.kpInitial, h0: config.controller.h0Initial, h0Start: config.controller.h0Initial}
            : {inValvePos: 0}),
        ...(config.evaluation[mode].integral && {turbineGain: config.evaluation[mode].turbine.gainInitial}),
        ...freshRun(mode, seed, initialLevel, referenceLevel),
    };
};

const append = (series, time, value) => [...series, [time, value]];

const tick = (model) => {
    const dt = config.simulation.step;
    const {referenceLevel} = model;

    const flows = modelFlows(model);
    const level = nextLevel(model.level, flows.flowIn, flows.flowOut, dt);
    const iae = model.iae + Math.abs(referenceLevel - level) * dt;

    const running = flows.supply.filter((status) => status !== null);
    const supply = {
        onSteps: model.supply.onSteps + running.length,
        okSteps: model.supply.okSteps + running.filter((status) => status !== ERROR).length,
    };

    const next = {...model, step: model.step + 1, level, iae, supply};
    //Turbine turns while there is an error and moves the carriage: level too low raises h0
    if (config.evaluation[model.mode].integral) {
        const [min, max] = config.controller.h0Limits;
        next.h0 = clamp(model.h0 + model.turbineGain * (referenceLevel - level) * dt, min, max);
    }
    const time = modelTime(next);
    const {history} = model;
    next.history = {
        level: append(history.level, time, level),
        error: append(history.error, time, iae),
        flowIn: append(history.flowIn, time, flows.flowIn),
        drain: append(history.drain, time, flows.drain),
        consumers: append(history.consumers, time, flows.consumersTotal),
        deviation: append(history.deviation, time, referenceLevel - level),
        setLevel: config.evaluation[model.mode].integral ? append(history.setLevel, time, next.h0) : history.setLevel,
    };
    return isFinished(next) ? {...next, status: STOP} : next;
};

//Settings fixed during a run on pages with lockSettings
const lockedInputs = ["kp", "h0", "turbineGain", "referenceLevel"];

export const modelReducer = (model, action) => {
    switch (action.type) {
        case TICK:
            return model.status === RUN ? tick(model) : model;
        case SET_STATUS:
            if (action.status === RESET) {
                return {
                    ...model,
                    ...freshRun(model.mode, action.seed ?? model.seed, model.initialLevel, model.referenceLevel),
                    //The turbine moved the carriage; put it back where the student set it
                    ...(config.evaluation[model.mode].integral && {h0: model.h0Start}),
                    status: RESET,
                };
            }
            if (action.status === RUN && isFinished(model)) return model;
            return {...model, status: action.status};
        case SET_INPUT:
            //Locked settings can't change once the run started
            if (config.evaluation[model.mode].lockSettings && model.step > 0 && lockedInputs.includes(action.name)) {
                return model;
            }
            //Where the student sets the carriage is where a reset puts it back
            if (action.name === "h0") return {...model, h0: action.value, h0Start: action.value};
            //A new start level applies right away while the run has not started
            if (action.name === "initialLevel" && model.step === 0) {
                return {
                    ...model,
                    initialLevel: action.value,
                    ...freshRun(model.mode, model.seed, action.value, model.referenceLevel),
                };
            }
            //A new reference applies before the run; pages starting at the reference start from the new one
            if (action.name === "referenceLevel") {
                if (model.step > 0) return model;
                const start = config.evaluation[model.mode].startAtReference ? action.value : model.initialLevel;
                return {
                    ...model,
                    referenceLevel: action.value,
                    initialLevel: start,
                    ...freshRun(model.mode, model.seed, start, action.value),
                };
            }
            return {...model, [action.name]: action.value};
        default:
            return model;
    }
};
