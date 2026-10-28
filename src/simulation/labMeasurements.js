import config from "../config";
import {drainScenarios} from "../labConfig";
import {meanLevel, timeConstant} from "./measurements";
import {isFinished, modelTime, supplyRatio} from "./reducer";

export const labMeasurements = (model) => {
    const time = modelTime(model);
    const scenario = drainScenarios.find(({id}) => id === model.scenario);
    const stepAt = config.evaluation[model.mode].research ? scenario?.at : undefined;
    const randomDrain = config.evaluation[model.mode].randomDrain ||
        (config.evaluation[model.mode].research && model.scenario === "random");
    const segmentStart = randomDrain
        ? model.drainSchedule.findLast(([step]) => step <= model.step)[0] * config.simulation.step
        : stepAt !== undefined && time >= stepAt ? stepAt : 0;
    const segment = model.history.level.filter(([t]) => t >= segmentStart);
    const tail = segment.filter(([t]) => t >= time - 10);
    const enough = time - segmentStart >= 10;
    const mean = meanLevel(tail);
    const range = Math.max(...tail.map(([, h]) => h)) - Math.min(...tail.map(([, h]) => h));
    const settled = enough && range <= 0.002;
    const response = settled && ["mechanical", "built"].includes(config.evaluation[model.mode].controller)
        ? timeConstant(segment.map(([t, h]) => [t - segmentStart, h])) : null;
    const before = stepAt !== undefined && time >= stepAt
        ? model.history.level.filter(([t]) => t >= stepAt - 10 && t < stepAt) : [];
    return {
        time, enough, mean, error: model.referenceLevel - mean, range, settled,
        steadyLevel: settled ? mean : null,
        t63: response?.t63 ?? null,
        preError: before.length ? model.referenceLevel - meanLevel(before) : null,
        overshoot: Math.max(0, ...model.history.level.map(([, h]) => h - model.referenceLevel)),
        iae: model.iae, supply: supplyRatio(model),
    };
};

export const labPassed = (model, measurements = labMeasurements(model)) => {
    if (!isFinished(model)) return null;
    const task = config.evaluation[model.mode];
    if (task.supplyTarget !== undefined) return measurements.supply !== null && measurements.supply >= task.supplyTarget;
    if (task.pass) return measurements.iae <= task.pass.iaeLimit && Math.abs(measurements.error) <= task.pass.meanTolerance;
    return null; //Research tasks require the student's comparison and explanation, not an automatic grade.
};
