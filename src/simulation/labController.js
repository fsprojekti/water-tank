import {clamp} from "./model";
import config from "../config";
import {labMechanics} from "../labConfig";

//Mechanical PI equivalence: Kp*(h0-h) = Kp*(reference-h) + I.
export const integralClosingLevel = (model) => model.referenceLevel + model.integralOutput / model.kp;
export const integralDriveGain = (model, controller) => controller === "parallelPI" ? model.ki / model.kp : model.ki;
export const integralBeltRatio = (model, controller) => integralDriveGain(model, controller) /
    (controller === "parallelPI" ? labMechanics.carriageUnitGain : labMechanics.valveUnitGain);

//Parallel form in normalized valve opening: u = Kp*e + integral(Ki*e dt).
//Ki is independent of Kp. I-only explicitly omits P, including when Kp is absent.
export const labControl = (model, controller) => {
    const p = controller === "parallelPI" ? model.kp * (model.referenceLevel - model.level) : 0;
    const i = model.integralOutput;
    return {p, i, command: clamp(p + i, 0, 1), saturated: p + i < 0 || p + i > 1};
};

export const nextIntegral = (model, controller, level, dt) => {
    const error = model.referenceLevel - level;
    const p = controller === "parallelPI" ? model.kp * error : 0;
    const raw = p + model.integralOutput;
    const delta = model.ki * error * dt;
    //Conditional integration: allow recovery from a limit, but do not wind further into it.
    if ((raw >= 1 && delta > 0) || (raw <= 0 && delta < 0)) return model.integralOutput;
    const [min, max] = config.controller.h0Limits;
    const limits = controller === "parallelPI"
        ? [Math.max(-1, model.kp * (min - model.referenceLevel)), Math.min(1, model.kp * (max - model.referenceLevel))]
        : [0, 1];
    return clamp(model.integralOutput + delta, ...limits);
};
