import config from "../config";
import tank from "../components/tankGeometry";
import {clamp} from "./model";

/**
 * Mechanism built by the student from parts: floats, bars, wheels and belts driving the intake valve.
 * A bar may have a motion axis: its own line, fixed to the frame, along which it slides without turning.
 * Parts are rigid bodies in world coordinates [m] (x along the scheme, y up from the tank bottom, angles
 * counterclockwise). Joints are equations between their poses; the water level is the only input.
 * Every step the poses are solved by Levenberg-Marquardt from the previous ones, so the mechanism follows
 * the float continuously. Wheels roll on the faces of bars and the rims of other wheels and belts transmit motion,
 * all by friction without slipping, except the valve pulley, which slips on its shaft at the valve end stops.
 */

const {m2Px} = config.render;

export const toPx = ([x, y]) => [x * m2Px, config.tank.offsetPx - y * m2Px];
export const fromPx = ([x, y]) => [x / m2Px, (config.tank.offsetPx - y) / m2Px];

export const floatHeight = 0.12;
export const barWidth = 0.025;
//Attachment points along a bar [m]
const pointStep = 0.1;
//Valve turns a quarter turn counterclockwise from closed to open [rad]
export const valveSpan = Math.PI / 2;
export const valveCentre = fromPx([config.intake.valveXPx, config.intake.valveYPx]);
//Largest level change solved in one go, so the mechanism follows the water continuously [m]
const levelStep = 0.01;
//A float held further off the water than this [m], or a joint opened by it, ends the working range
const jamTolerance = 0.005;
//Residual weights: joints are rigid; buoyancy and the student's hand give way to them
const floatWeight = 0.03;
const dragWeight = 0.01;
//Water spans the tank between its walls [m]
const tankSpan = [tank.innerLeftPx / m2Px, tank.innerRightPx / m2Px];

//Parameters [m] with their allowed range, editable by the student
export const partTypes = {
    float: {label: "Plovec", params: {width: [0.5, 0.2, 0.8]}},
    bar: {label: "Letev", params: {length: [0.6, 0.1, 1.5]}},
    wheel: {label: "Kolo", params: {radius: [0.08, 0.02, 0.2]}},
    valve: {label: "Ventil", params: {radius: [0.06, 0.02, 0.15]}},
};

export const isWheel = (part) => part.type === "wheel" || part.type === "valve";
//Bodies with a free pose; the valve only turns
const isMovable = (part) => part.type === "float" || part.type === "bar" || part.type === "wheel";

//Attachment points {id, at: local [x, y] m}: float top, every 10 cm along a bar, wheel axle
export const partPoints = (part) => {
    if (part.type === "float") {
        const half = part.width / 2 - 0.04;
        return [{id: "left", at: [-half, floatHeight]}, {id: "center", at: [0, floatHeight]},
            {id: "right", at: [half, floatHeight]}];
    }
    if (part.type === "bar") {
        const points = [];
        for (let i = 0; i * pointStep <= part.length + 1e-9; i++) points.push(i * pointStep);
        if (part.length - points.at(-1) > 1e-9) points.push(part.length);
        return points.map((d) => ({id: String(Math.round(d * 100)), at: [d, 0]}));
    }
    return [{id: "axle", at: [0, 0]}];
};

export const pointLabel = (part, pointId) => {
    if (part.type === "float") return {left: "levo", center: "sredina", right: "desno"}[pointId];
    if (part.type === "bar") return `${pointId} cm`;
    return "os";
};

export const worldPoint = (pose, [x, y]) => {
    const c = Math.cos(pose.a), s = Math.sin(pose.a);
    return [pose.x + x * c - y * s, pose.y + x * s + y * c];
};

export const partPoint = (part, pose, pointId) =>
    worldPoint(pose, (partPoints(part).find(({id}) => id === pointId) ?? partPoints(part).at(-1)).at);

const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

//Wheel centre in a bar's frame: along the bar from its first end, and across it (left positive)
export const barFrame = (bar, [x, y]) => {
    const c = Math.cos(bar.a), s = Math.sin(bar.a);
    const dx = x - bar.x, dy = y - bar.y;
    return [dx * c + dy * s, -dx * s + dy * c];
};

export const floatsOnWater = (part, pose) =>
    part.type === "float" && pose.x > tankSpan[0] && pose.x < tankSpan[1];

/**
 * Residual equations of a joint, zero when it holds. P(id) is the current pose of a part.
 * Rolling: the wheel turns by the distance it rolls along the bar (or the other wheel) over its radius.
 */
const jointEquations = (joint, parts) => {
    switch (joint.type) {
        case "pin":
        case "weld": {
            const a = parts[joint.a.part], b = parts[joint.b.part];
            return (P) => {
                const pa = partPoint(a, P(a.id), joint.a.point), pb = partPoint(b, P(b.id), joint.b.point);
                const position = [pa[0] - pb[0], pa[1] - pb[1]];
                return joint.type === "weld" ? [...position, Math.sin(P(a.id).a - P(b.id).a - joint.angle)] : position;
            };
        }
        case "ground": {
            const a = parts[joint.a.part];
            return (P) => {
                const p = partPoint(a, P(a.id), joint.a.point);
                return [p[0] - joint.at[0], p[1] - joint.at[1]];
            };
        }
        case "axis":
            //The bar keeps its angle and its anchor (a point fixed in the bar) stays on the line
            return (P) => {
                const bar = P(joint.bar);
                const [x, y] = worldPoint(bar, joint.local);
                return [Math.sin(bar.a - joint.barAngle),
                    -(x - joint.at[0]) * Math.sin(joint.angle) + (y - joint.at[1]) * Math.cos(joint.angle)];
            };
        case "contact": {
            const wheel = parts[joint.a], other = parts[joint.b];
            if (other.type === "bar") {
                return (P) => {
                    const w = P(wheel.id), bar = P(other.id);
                    const [u, v] = barFrame(bar, [w.x, w.y]);
                    return [v - joint.side * (wheel.radius + barWidth / 2),
                        u + joint.side * wheel.radius * (w.a - bar.a) - joint.offset];
                };
            }
            return (P) => {
                const p = P(wheel.id), q = P(other.id);
                const alpha = joint.alpha + wrap(Math.atan2(q.y - p.y, q.x - p.x) - joint.alpha);
                return [Math.hypot(q.x - p.x, q.y - p.y) - wheel.radius - other.radius,
                    wheel.radius * (p.a - alpha) + other.radius * (q.a - alpha) - joint.offset];
            };
        }
        case "belt": {
            const a = parts[joint.a], b = parts[joint.b];
            //Open belt turns both pulleys the same way, a crossed one the opposite way
            return (P) => [a.radius * P(a.id).a + (joint.crossed ? 1 : -1) * b.radius * P(b.id).a - joint.offset];
        }
        default:
            return () => [];
    }
};

const partMap = (assembly) => Object.fromEntries(assembly.parts.map((part) => [part.id, part]));

//Pose variables: x, y, angle of each movable part and the valve angle
const layout = (assembly) => {
    const index = {};
    let n = 0;
    for (const part of assembly.parts) {
        if (isMovable(part)) {
            index[part.id] = n;
            n += 3;
        } else if (part.type === "valve") {
            index[part.id] = n;
            n += 1;
        }
    }
    return {index, n};
};

const readPoses = (assembly, poses, index, q) => {
    const result = {...poses};
    for (const part of assembly.parts) {
        const i = index[part.id];
        if (i === undefined) continue;
        result[part.id] = isMovable(part) ? {x: q[i], y: q[i + 1], a: q[i + 2]} : {...poses[part.id], a: q[i]};
    }
    return result;
};

const packPoses = (assembly, poses, {index, n}) => {
    const q = new Float64Array(n);
    for (const part of assembly.parts) {
        const i = index[part.id];
        if (i === undefined) continue;
        const pose = poses[part.id];
        if (isMovable(part)) [q[i], q[i + 1], q[i + 2]] = [pose.x, pose.y, pose.a];
        else q[i] = pose.a;
    }
    return q;
};

/**
 * Weighted equations of the whole mechanism: joints, floats on the water at the level, and an optional drag
 * target {id, pose} pulling a part towards where the student holds it (that part, if a float, is lifted off
 * the water). unit: all weights 1, for counting degrees of freedom.
 */
const equations = (assembly, poses, level, {drag, unit = false} = {}) => {
    const parts = partMap(assembly);
    const terms = assembly.joints.map((joint) => ({weight: 1, hard: true, f: jointEquations(joint, parts)}));
    for (const part of assembly.parts) {
        if (!floatsOnWater(part, poses[part.id]) || drag?.id === part.id) continue;
        terms.push({weight: unit ? 1 : floatWeight, float: true,
            f: (P) => [P(part.id).y - level, Math.sin(P(part.id).a) * part.width / 2]});
    }
    if (drag && isMovable(parts[drag.id])) {
        const {x, y, a} = drag.pose;
        terms.push({weight: dragWeight, f: (P) => [P(drag.id).x - x, P(drag.id).y - y, Math.sin(P(drag.id).a - a)]});
    }
    return terms;
};

const evaluate = (terms, P) => {
    const out = [];
    for (const term of terms) for (const value of term.f(P)) out.push(value * term.weight);
    return out;
};

const jacobian = (residual, q, r) => {
    const eps = 1e-7;
    const columns = [];
    for (let j = 0; j < q.length; j++) {
        const shifted = Float64Array.from(q);
        shifted[j] += eps;
        const rs = residual(shifted);
        columns.push(rs.map((value, i) => (value - r[i]) / eps));
    }
    return columns;
};

//Solves A x = b by Gaussian elimination with partial pivoting; singular directions stay at zero
const solveLinear = (A, b) => {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let row = col + 1; row < n; row++) if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
        [M[col], M[pivot]] = [M[pivot], M[col]];
        if (Math.abs(M[col][col]) < 1e-300) continue;
        for (let row = col + 1; row < n; row++) {
            const factor = M[row][col] / M[col][col];
            if (factor === 0) continue;
            for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
        }
    }
    const x = new Array(n).fill(0);
    for (let row = n - 1; row >= 0; row--) {
        if (Math.abs(M[row][row]) < 1e-300) continue;
        let sum = M[row][n];
        for (let k = row + 1; k < n; k++) sum -= M[row][k] * x[k];
        x[row] = sum / M[row][row];
    }
    return x;
};

/**
 * Poses that satisfy the mechanism at the water level, starting from the given ones. Least squares: what can't
 * hold exactly (a jammed float, the student's drag) gives way to the joints; free motion stays where it was.
 */
export const solve = (assembly, poses, level, options = {}) => {
    const vars = layout(assembly);
    if (!vars.n) return poses;
    const terms = equations(assembly, poses, level, options);
    const residual = (q) => {
        const current = readPoses(assembly, poses, vars.index, q);
        return evaluate(terms, (id) => current[id]);
    };
    //Levenberg-Marquardt: a step is taken only if it lowers the error, otherwise it is damped and tried again,
    //so the solver also settles where the joints can't all hold (a float hanging below a lever's dead centre)
    let q = packPoses(assembly, poses, vars);
    let r = residual(q);
    let cost = r.reduce((sum, value) => sum + value * value, 0);
    let damping = 1e-6;
    for (let iteration = 0; iteration < 60 && r.length && cost > 1e-24; iteration++) {
        const J = jacobian(residual, q, r);
        const n = q.length;
        const A = Array.from({length: n}, () => new Array(n).fill(0));
        const g = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = i; j < n; j++) {
                let sum = 0;
                for (let k = 0; k < r.length; k++) sum += J[i][k] * J[j][k];
                A[i][j] = A[j][i] = sum;
            }
            for (let k = 0; k < r.length; k++) g[i] -= J[i][k] * r[k];
        }
        let improved = false;
        while (damping < 1e6) {
            const damped = A.map((row, i) => row.map((value, j) => (i === j ? value * (1 + damping) + 1e-12 : value)));
            let step = solveLinear(damped, g);
            const largest = Math.max(...step.map(Math.abs));
            if (largest > 0.2) step = step.map((value) => value * 0.2 / largest);
            const trial = q.map((value, i) => value + step[i]);
            const trialResidual = residual(trial);
            const trialCost = trialResidual.reduce((sum, value) => sum + value * value, 0);
            if (trialCost < cost) {
                [q, r, cost] = [trial, trialResidual, trialCost];
                damping = Math.max(damping / 4, 1e-9);
                improved = largest > 1e-11;
                break;
            }
            damping *= 4;
        }
        if (!improved) break;
    }
    return readPoses(assembly, poses, vars.index, q);
};

//Largest joint error [m], and the float furthest off the water [m]: above it (hanging) positive
export const residuals = (assembly, poses, level) => {
    const terms = equations(assembly, poses, level, {unit: true});
    const values = (list) => evaluate(list, (id) => poses[id]);
    const offsets = values(terms.filter((t) => t.float)).filter((_, i) => i % 2 === 0);
    const float = offsets.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    return {joints: Math.max(0, ...values(terms.filter((t) => t.hard)).map(Math.abs)), float};
};

//The valve pulley slips on its shaft at the end stops: zero is the pulley angle where the valve is closed
const clutch = (angle, zero) => {
    if (angle - zero > valveSpan) return angle - valveSpan;
    return angle < zero ? angle : zero;
};

export const mechanismState = (poses, level, zero) => ({
    level, poses, zero, opening: clamp((poses.valve.a - zero) / valveSpan, 0, 1),
});

/**
 * Follows the water from the state's level to a new one in small steps; the valve pulley slips at the stops,
 * so after saturation the closing level moves, as it would on the real friction drive.
 */
export const settle = (assembly, state, level) => {
    const steps = Math.max(1, Math.ceil(Math.abs(level - state.level) / levelStep - 1e-9));
    let {poses, zero} = state;
    for (let i = 1; i <= steps; i++) {
        poses = solve(assembly, poses, state.level + (level - state.level) * i / steps);
        zero = clutch(poses.valve.a, zero);
    }
    return mechanismState(poses, level, zero);
};

/**
 * Parts that can still move with the water level held: rank of the joint equations by Gauss-Jordan elimination,
 * then the parts with a share in any free direction.
 */
export const looseParts = (assembly, poses, level) => {
    const vars = layout(assembly);
    const terms = equations(assembly, poses, level, {unit: true});
    const q = packPoses(assembly, poses, vars);
    const residual = (x) => {
        const current = readPoses(assembly, poses, vars.index, x);
        return evaluate(terms, (id) => current[id]);
    };
    const r = residual(q);
    const columns = jacobian(residual, q, r);
    const rows = r.map((_, k) => {
        const row = columns.map((column) => column[k]);
        const norm = Math.hypot(...row);
        return norm > 1e-9 ? row.map((value) => value / norm) : row;
    });
    const pivots = [];
    let rank = 0;
    for (let col = 0; col < vars.n && rank < rows.length; col++) {
        let best = rank;
        for (let row = rank + 1; row < rows.length; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[best][col])) best = row;
        if (Math.abs(rows[best][col]) < 1e-6) continue;
        [rows[rank], rows[best]] = [rows[best], rows[rank]];
        const lead = rows[rank][col];
        rows[rank] = rows[rank].map((value) => value / lead);
        for (let row = 0; row < rows.length; row++) {
            if (row === rank || rows[row][col] === 0) continue;
            const factor = rows[row][col];
            rows[row] = rows[row].map((value, k) => value - factor * rows[rank][k]);
        }
        pivots.push(col);
        rank++;
    }
    const moving = new Set();
    for (let free = 0; free < vars.n; free++) {
        if (pivots.includes(free)) continue;
        moving.add(free);
        pivots.forEach((col, row) => { if (Math.abs(rows[row][free]) > 1e-6) moving.add(col); });
    }
    return new Set(assembly.parts.filter((part) => {
        const i = vars.index[part.id];
        if (i === undefined) return false;
        return [...Array(isMovable(part) ? 3 : 1).keys()].some((k) => moving.has(i + k));
    }).map((part) => part.id));
};

const jointParts = (joint) => {
    if (joint.type === "pin" || joint.type === "weld") return [joint.a.part, joint.b.part];
    if (joint.type === "ground") return [joint.a.part];
    if (joint.type === "axis") return [joint.bar];
    return [joint.a, joint.b];
};

export const partJoints = (assembly, id) => assembly.joints.filter((joint) => jointParts(joint).includes(id));

/**
 * Valve opening against level without slipping (the student's design, not the clutch), found by moving the
 * water over the whole tank. Kp is the closing slope at the level h0 where the valve just closes; a valve that
 * opens with rising water is positive feedback. Issues lists what keeps the mechanism from working.
 */
export const analyse = (assembly, state) => {
    const parts = partMap(assembly);
    const sweep = (to) => {
        const samples = [];
        let poses = state.poses;
        const steps = Math.round(Math.abs(to - state.level) / levelStep);
        for (let i = 1; i <= steps; i++) {
            const level = state.level + (to - state.level) * i / steps;
            poses = solve(assembly, poses, level);
            samples.push({level, poses});
        }
        return samples;
    };
    const samples = [...sweep(0).reverse(), {level: state.level, poses: state.poses}, ...sweep(config.tank.height)];
    const curve = samples.map(({level, poses}) => ({level, opening: (poses.valve.a - state.zero) / valveSpan,
        ...residuals(assembly, poses, level), poses}));
    const issues = [];
    const floats = assembly.parts.filter((part) => part.type === "float");
    if (!floats.length) issues.push("Ni plovca: mehanizem ne zazna nivoja.");
    else if (!floats.some((part) => floatsOnWater(part, state.poses[part.id]))) issues.push("Plovec ni v posodi, zato ne sledi gladini.");
    const unattached = assembly.parts.filter((part) => part.type !== "float" &&
        !partJoints(assembly, part.id).length).map((part) => part.id);
    const notice = {
        bar: (name) => `${name} ni pritrjena.`,
        wheel: (name) => `${name} ni pritrjeno.`,
        valve: () => "Ventil ni povezan z mehanizmom.",
    };
    unattached.forEach((id) => issues.push(notice[parts[id].type](parts[id].name)));
    //A float on its own just floats; parts not joined to anything are already listed
    const loose = [...looseParts(assembly, state.poses, state.level)].filter((id) =>
        !unattached.includes(id) && (parts[id].type !== "float" || partJoints(assembly, id).length));
    if (loose.length) {
        issues.push(`Mehanizem ni določen, prosto se lahko premika: ${loose.map((id) => parts[id].name).join(", ")}.`);
    }
    //Working range around the current level: beyond it the mechanism jams or holds the float off the water
    const bad = (point) => Math.abs(point.float) > jamTolerance || point.joints > jamTolerance;
    const current = curve.findIndex((point) => point.poses === state.poses);
    let [first, last] = [current, current];
    while (first > 0 && !bad(curve[first - 1])) first--;
    while (last < curve.length - 1 && !bad(curve[last + 1])) last++;
    const limit = (point, below) => {
        if (!point) return;
        const where = `${below ? "Pod" : "Nad"} nivojem ${point.level.toFixed(2)} m`;
        if (point.joints > jamTolerance) issues.push(`${where} se mehanizem zatakne.`);
        else if (point.float > 0) issues.push(`${where} plovec obvisi na mehanizmu.`);
        else issues.push(`${where} mehanizem potisne plovec pod vodo.`);
    };
    limit(curve[first - 1], true);
    limit(curve[last + 1], false);
    const valid = curve.slice(first, last + 1);
    //Levels nearest the current one, below and above, where a wheel runs off its bar
    const index = valid.findIndex((point) => point.poses === state.poses);
    const edges = (outside) => {
        const below = valid.slice(0, index).findLast(outside), above = valid.slice(index + 1).find(outside);
        return [below && `pod nivojem ${below.level.toFixed(2)} m`, above && `nad nivojem ${above.level.toFixed(2)} m`]
            .filter(Boolean).join(" in ");
    };
    const along = (bar, at) => (point) => {
        const [u] = barFrame(point.poses[bar], at(point.poses));
        return u < 0 || u > parts[bar].length;
    };
    for (const joint of assembly.joints.filter((j) => j.type === "contact" && parts[j.b].type === "bar")) {
        const where = edges(along(joint.b, (poses) => [poses[joint.a].x, poses[joint.a].y]));
        if (where) issues.push(`${parts[joint.a].name} zdrsne z ${parts[joint.b].name.toLowerCase().replace("letev", "letve")} ${where}.`);
    }

    //Closing level nearest the current level, and the slope of the opening there
    let h0 = null, slope = null;
    for (let i = 0; i + 1 < valid.length; i++) {
        const [a, b] = [valid[i], valid[i + 1]];
        if (a.opening * b.opening > 0 || a.opening === b.opening) continue;
        const level = a.level + (b.level - a.level) * a.opening / (a.opening - b.opening);
        if (h0 === null || Math.abs(level - state.level) < Math.abs(h0 - state.level)) {
            h0 = level;
            slope = (b.opening - a.opening) / (b.level - a.level);
        }
    }
    if (slope === null && valid.length > 1) {
        const i = Math.max(1, valid.findIndex((point) => point.level >= state.level - 1e-9));
        slope = (valid[i].opening - valid[i - 1].opening) / (valid[i].level - valid[i - 1].level);
    }
    const driven = slope !== null && Math.abs(slope) > 0.05;
    if (!driven) issues.push("Ventil se ne odziva na spremembo nivoja.");
    else if (slope > 0) issues.push("Pozitivna povratna zanka: ventil se odpira, ko nivo raste.");
    else if (h0 === null) issues.push("Ventil se v območju 0–1 m nikjer ne zapre.");
    return {
        kp: driven ? -slope : 0, h0, positive: driven && slope > 0, issues, unattached, loose,
        curve: curve.map(({level, opening}) => [level, opening]),
    };
};
