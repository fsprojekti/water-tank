import config from "../config";

const {tank, simulation, intake, drain} = config;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

//Intake flow [m³/s] for valve opening [%]
export const intakeFlow = (valvePos) => intake.flowMax * clamp(valvePos, 0, 100) / 100;

//Drain flow (Torricelli) [m³/s] for tank level [m] and valve opening [%]
export const drainFlow = (level, valvePos) =>
    Math.sqrt(2 * simulation.gravity * Math.max(level, 0)) * clamp(valvePos, 0, 100) / 100 / drain.valveConstant;

//Consumer outlet flow (Torricelli) [m³/s] for tank level [m] and pipe diameter [mm]
export const consumerFlow = (level, diameterMm) => {
    const radius = diameterMm / 2000;
    return config.consumers.dischargeCoefficient * Math.PI * radius * radius *
        Math.sqrt(2 * simulation.gravity * Math.max(level, 0));
};

//Valve opening of a consumer (0…1): full when on, idle share when off, closed when disabled
export const consumerOpening = (on, enabled = true) => {
    if (on) return 1;
    return enabled ? config.consumers.idleFlowRatio : 0;
};

//Flows of all consumers [m³/s]
export const consumerFlows = (level, states, enabled = states.map(() => true)) =>
    config.consumers.list.map((consumer, i) =>
        consumerFlow(level, consumer.diameterMm) * consumerOpening(states[i], enabled[i]));

export const OK = "ok";
export const WARNING = "warning";
export const ERROR = "error";

//Whether a consumer gets its nominal flow: within ok tolerance, within warning tolerance, or not
export const supplyStatus = (flow, nominal) => {
    const {ok, warning} = config.consumers.tolerance;
    const deviation = Math.abs(flow - nominal) / nominal;
    if (deviation <= ok) return OK;
    if (deviation <= warning) return WARNING;
    return ERROR;
};

//Tank level [m] after one explicit Euler step; area [m²] is the cross-section at the current level
export const nextLevel = (level, flowIn, flowOut, dt = simulation.step, area = tank.area) =>
    clamp(level + (flowIn - flowOut) * dt / area, 0, tank.height);
