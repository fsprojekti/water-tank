//Mean level [m] of a [time, level] series
export const meanLevel = (level) => level.reduce((sum, [, value]) => sum + value, 0) / level.length;

//Steady state: level changes less than this [m] over this time window [s]
export const steadyBandM = 0.001;
export const steadyWindowS = 3;

/**
 * Time [s] when the level first reaches the target, coming from the start level (filling or draining).
 * level is a list of [time, level] pairs; null when not reached yet or the run starts at the target.
 */
export const targetReachedAt = (level, target) => {
    if (level.length === 0) return null;
    const below = level[0][1] < target;
    if (level[0][1] === target) return null;
    const hit = level.find(([, value]) => (below ? value >= target : value <= target));
    return hit ? hit[0] : null;
};

/**
 * Current steady state of the level: it has stayed within steadyBandM for at least steadyWindowS up to now.
 * Returns {time, level} with the time the level settled and the latest level, or null while it still moves.
 */
export const steadyState = (level) => {
    if (level.length < 2) return null;
    const dt = level[1][0] - level[0][0];
    const size = Math.round(steadyWindowS / dt) + 1;
    if (level.length < size) return null;
    const latest = level[level.length - 1][1];
    const within = ([, value]) => Math.abs(value - latest) < steadyBandM / 2;
    //Walk back while the level stays within the band around the latest value
    let start = level.length - 1;
    while (start > 0 && within(level[start - 1])) start--;
    return level.length - start >= size ? {time: level[start][0], level: latest} : null;
};

/**
 * Time constant of a step response: time [s] when the level first covered 63.2 % of the way from the start level
 * to the current steady state. Returns {steady, t63} once the level has settled, otherwise null.
 */
export const timeConstant = (level) => {
    const steady = steadyState(level);
    if (steady === null || level.length === 0) return null;
    const start = level[0][1];
    const change = steady.level - start;
    if (Math.abs(change) < steadyBandM) return null;
    const mark = start + 0.632 * change;
    const hit = level.find(([, value]) => (change > 0 ? value >= mark : value <= mark));
    return {steady, t63: hit[0]};
};
