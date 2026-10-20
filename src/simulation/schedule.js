import config from "../config";

//Small seeded PRNG (mulberry32), returns floats in [0, 1)
export const random = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const nextSeed = () => config.consumers.seed ?? Math.floor(Math.random() * 2 ** 32);

//Random whole number of steps for a duration range [s]
const stepsIn = (rand, [min, max]) => Math.round((min + rand() * (max - min)) / config.simulation.step);

//Pick count distinct consumer indices
const pickConsumers = (rand, count, total) => {
    const indices = Array.from({length: total}, (_, i) => i);
    for (let i = total - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, count);
};

//Several consumers switch on together for a short time, then the plant is quiet again
const burstSchedule = (rand, totalSteps) => {
    const {list, burst} = config.consumers;
    const schedule = list.map(() => []);
    const jitter = () => stepsIn(rand, [0, burst.jitterSeconds]);

    let step = stepsIn(rand, burst.gapSeconds);
    while (step < totalSteps) {
        const [minCount, maxCount] = burst.consumers;
        const count = minCount + Math.floor(rand() * (maxCount - minCount + 1));
        const length = stepsIn(rand, burst.onSeconds);
        pickConsumers(rand, count, list.length).forEach((i) => {
            const on = step + jitter();
            schedule[i].push([on, Math.max(on + 1, step + length - jitter())]);
        });
        //Next burst starts after the last consumer of this one is off
        step += length + burst.jitterSeconds / config.simulation.step + stepsIn(rand, burst.gapSeconds);
    }
    return schedule;
};

//Share of all consumers' capacity (pipe cross-sections) drawn by each consumer
const capacityShares = () => {
    const areas = config.consumers.list.map((consumer) => consumer.diameterMm ** 2);
    const total = areas.reduce((a, b) => a + b, 0);
    return areas.map((area) => area / total);
};

//On/off states (one per consumer) whose capacity share is closest to the target share
const closestCombination = (shares, target) => {
    let best = null;
    for (let mask = 0; mask < 2 ** shares.length; mask++) {
        const share = shares.reduce((sum, value, i) => sum + (mask & (1 << i) ? value : 0), 0);
        if (best === null || Math.abs(share - target) < Math.abs(best.share - target)) best = {mask, share};
    }
    return shares.map((_, i) => Boolean(best.mask & (1 << i)));
};

//Total demand jumps between random levels every few seconds; now and then it drops to zero briefly
const demandSchedule = (rand, totalSteps) => {
    const {demand} = config.consumers;
    const shares = capacityShares();
    const schedule = shares.map(() => []);
    const open = shares.map(() => null);

    let step = 0;
    while (step < totalSteps) {
        const drop = rand() < demand.dropChance;
        const target = drop ? 0 : demand.range[0] + rand() * (demand.range[1] - demand.range[0]);
        const states = closestCombination(shares, target);
        const end = Math.min(totalSteps, step + stepsIn(rand, drop ? demand.dropSeconds : demand.holdSeconds));
        //Extend running intervals, close stopped ones, open started ones
        states.forEach((on, i) => {
            if (on && open[i] === null) open[i] = step;
            if (!on && open[i] !== null) {
                schedule[i].push([open[i], step]);
                open[i] = null;
            }
        });
        step = end;
    }
    open.forEach((start, i) => start !== null && schedule[i].push([start, step]));
    return schedule;
};

//Each consumer switches on and off on its own
const independentSchedule = (rand, totalSteps) => {
    const {list, onSeconds, offSeconds} = config.consumers;
    const steps = (range) => stepsIn(rand, range);

    return list.map(() => {
        const intervals = [];
        //Consumers start off at staggered times
        let step = steps([0, offSeconds[1]]);
        while (step < totalSteps) {
            const off = step + steps(onSeconds);
            intervals.push([step, off]);
            step = off + steps(offSeconds);
        }
        return intervals;
    });
};

/**
 * Random on/off pattern of every consumer up to totalSteps.
 * Returns per consumer a list of [onStep, offStep) intervals in simulation steps.
 */
export const createSchedule = (seed, totalSteps) => {
    const rand = random(seed);
    const patterns = {demand: demandSchedule, bursts: burstSchedule, independent: independentSchedule};
    return (patterns[config.consumers.pattern] ?? demandSchedule)(rand, totalSteps);
};

//On/off state of every consumer during simulation step
export const consumerStates = (schedule, step) =>
    schedule.map((intervals) => intervals.some(([on, off]) => step >= on && step < off));
