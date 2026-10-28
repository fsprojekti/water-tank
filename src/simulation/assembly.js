import {
    barFrame, barWidth, floatHeight, floatsOnWater, isWheel, mechanismState, partJoints, partPoint, partPoints, partTypes,
    residuals, settle, solve, valveCentre, worldPoint,
} from "./mechanism";

/**
 * Editing a student's mechanism. A build is {assembly: {parts, joints, next}, state: {level, poses, zero, opening}};
 * every operation returns a new build with the joints holding, or {error} when the change can't be assembled.
 */

//A wheel rim this close to a bar or another wheel is mounted against it [m]; by hand it is placed less exactly
const contactTolerance = 0.008;
const handTolerance = 0.02;
const jointTolerance = 0.001;
const storageKey = "water-tank-mechanism";

const valvePart = {id: "valve", type: "valve", name: "Ventil", radius: partTypes.valve.params.radius[0]};

export const emptyBuild = (level) => ({
    assembly: {parts: [valvePart], joints: [], next: {p: 1, j: 1}},
    state: mechanismState({valve: {x: valveCentre[0], y: valveCentre[1], a: 0}}, level, 0),
});

const parts = (assembly) => Object.fromEntries(assembly.parts.map((part) => [part.id, part]));

//Joint constants (weld angle, rolling and belt offsets) from the current poses, so a new joint holds as assembled
const capture = (joint, assembly, poses) => {
    const p = parts(assembly);
    switch (joint.type) {
        case "weld":
            return {...joint, angle: poses[joint.a.part].a - poses[joint.b.part].a};
        case "contact": {
            const wheel = p[joint.a], other = p[joint.b], w = poses[joint.a], o = poses[joint.b];
            if (other.type === "bar") {
                const c = Math.cos(o.a), s = Math.sin(o.a), dx = w.x - o.x, dy = w.y - o.y;
                const side = Math.sign(-dx * s + dy * c) || 1;
                return {...joint, side, offset: dx * c + dy * s + side * wheel.radius * (w.a - o.a)};
            }
            const alpha = Math.atan2(o.y - w.y, o.x - w.x);
            return {...joint, alpha, offset: wheel.radius * (w.a - alpha) + other.radius * (o.a - alpha)};
        }
        case "belt":
            return {...joint, offset: p[joint.a].radius * poses[joint.a].a +
                    (joint.crossed ? 1 : -1) * p[joint.b].radius * poses[joint.b].a};
        default:
            return joint;
    }
};

//Constants of the joints of one part, after it changed size
const recapture = (assembly, poses, id) => ({
    ...assembly,
    joints: assembly.joints.map((joint) => (partJoints({joints: [joint]}, id).length ? capture(joint, assembly, poses) : joint)),
});

//Solves at the build's level; the valve pulley slips at its stops like in a run
const resolve = (assembly, state, options) => {
    const poses = solve(assembly, state.poses, state.level, options);
    const angle = poses.valve.a;
    const zero = angle < state.zero ? angle : Math.max(state.zero, angle - Math.PI / 2);
    return {assembly, state: mechanismState(poses, state.level, zero)};
};

const holds = (build) => residuals(build.assembly, build.state.poses, build.state.level).joints <= jointTolerance;

//Parts are numbered p1, p2, … and joints j1, j2, … in the order they were added
const nextId = (assembly, prefix) =>
    [`${prefix}${assembly.next[prefix]}`, {...assembly, next: {...assembly.next, [prefix]: assembly.next[prefix] + 1}}];

export const barAxis = (assembly, id) => assembly.joints.find((j) => j.type === "axis" && j.bar === id);

//Motion axis through a point [m] at an angle [rad]: the bar slides along it without turning
const newAxis = (bar, pose, at, angle) => ({type: "axis", bar, at, angle, local: barFrame(pose, at), barAngle: pose.a});

const replaceJoint = (assembly, joint) => ({...assembly, joints: assembly.joints.map((j) => (j.id === joint.id ? joint : j))});

//Distance [m] from a wheel rim to a bar surface or another wheel rim, null when off the bar's length
const rimGap = (wheel, wheelPose, other, otherPose) => {
    if (other.type === "bar") {
        const c = Math.cos(otherPose.a), s = Math.sin(otherPose.a);
        const dx = wheelPose.x - otherPose.x, dy = wheelPose.y - otherPose.y;
        const along = dx * c + dy * s;
        if (along < 0 || along > other.length) return null;
        return Math.abs(-dx * s + dy * c) - wheel.radius - barWidth / 2;
    }
    return Math.hypot(otherPose.x - wheelPose.x, otherPose.y - wheelPose.y) - wheel.radius - other.radius;
};

/**
 * Wheels touching a bar or another wheel are mounted against it: a friction contact is added when the rim is
 * within the tolerance and the mechanism can be assembled with it.
 */
const mountContacts = (build, tolerance = contactTolerance) => {
    let current = build;
    const list = current.assembly.parts;
    for (const wheel of list.filter(isWheel)) {
        for (const other of list) {
            if (other.id === wheel.id || !(other.type === "bar" || isWheel(other))) continue;
            if (isWheel(other) && other.id < wheel.id) continue;
            const {assembly, state} = current;
            const touching = assembly.joints.some((j) => j.type === "contact" &&
                [j.a, j.b].includes(wheel.id) && [j.a, j.b].includes(other.id));
            const gap = rimGap(wheel, state.poses[wheel.id], other, state.poses[other.id]);
            if (touching || gap === null || Math.abs(gap) > tolerance) continue;
            const [id, numbered] = nextId(assembly, "j");
            const joint = capture({id, type: "contact", a: wheel.id, b: other.id}, numbered, state.poses);
            const candidate = resolve({...numbered, joints: [...numbered.joints, joint]}, state);
            if (holds(candidate)) current = candidate;
        }
    }
    return current;
};

const partName = (assembly, type) => {
    const {label} = partTypes[type];
    const used = assembly.parts.filter((part) => part.name.startsWith(label))
        .map((part) => Number(part.name.slice(label.length + 1)) || 0);
    return `${label} ${Math.max(0, ...used) + 1}`;
};

/**
 * New part centred where it is dropped [m]; a float falls onto the water. A bar starts vertical with its motion
 * axis along it, so it slides up and down like a rack until the student turns the axis or takes it off.
 */
export const addPart = (build, type, [x, y]) => {
    let [id, assembly] = nextId(build.assembly, "p");
    const params = Object.fromEntries(Object.entries(partTypes[type].params).map(([key, [value]]) => [key, value]));
    const part = {id, type, name: partName(assembly, type), ...params};
    const pose = {
        float: {x, y: y - floatHeight / 2, a: 0},
        bar: {x, y: y - (params.length ?? 0) / 2, a: Math.PI / 2},
        wheel: {x, y, a: 0},
    }[type];
    assembly = {...assembly, parts: [...assembly.parts, part]};
    if (type === "bar") {
        const [axisId, numbered] = nextId(assembly, "j");
        assembly = {...numbered, joints: [...numbered.joints, {id: axisId, ...newAxis(id, pose, [x, y], pose.a)}]};
    }
    return mountContacts(resolve(assembly, {...build.state, poses: {...build.state.poses, [id]: pose}}), handTolerance);
};

/**
 * Part held by the student at a pose; joints and the water win where they disagree. A bar takes its motion axis
 * along sideways, and the sleeve stays where it holds the bar.
 */
export const dragPart = (build, id, pose) => {
    const part = build.assembly.parts.find((p) => p.id === id);
    if (part.type === "valve") return build;
    const current = build.state.poses[id];
    //A free part simply goes where it is put
    if (free(build, id) && !floatsOnWater(part, pose)) return movePartBy(build, id, [pose.x - current.x, pose.y - current.y]);
    let {assembly} = build;
    const axis = barAxis(assembly, id);
    if (axis) {
        const across = -(pose.x - current.x) * Math.sin(axis.angle) + (pose.y - current.y) * Math.cos(axis.angle);
        assembly = replaceJoint(assembly, {...axis,
            at: [axis.at[0] - across * Math.sin(axis.angle), axis.at[1] + across * Math.cos(axis.angle)]});
    }
    const result = resolve(assembly, build.state, {drag: {id, pose}});
    if (!axis) return result;
    const moved = barAxis(result.assembly, id);
    return {...result, assembly: replaceJoint(result.assembly, {...moved, at: worldPoint(result.state.poses[id], moved.local)})};
};

//Released part: a float drops back onto the water, wheels mount against what they touch
export const dropPart = (build) => mountContacts(resolve(build.assembly, build.state), handTolerance);

//Moves a part with its motion axis
const movePartBy = (build, id, [dx, dy]) => {
    const pose = build.state.poses[id];
    const axis = barAxis(build.assembly, id);
    return {
        assembly: axis ? replaceJoint(build.assembly, {...axis, at: [axis.at[0] + dx, axis.at[1] + dy]}) : build.assembly,
        state: {...build.state, poses: {...build.state.poses, [id]: {...pose, x: pose.x + dx, y: pose.y + dy}}},
    };
};

//Not joined to any other part (a bar may have its motion axis)
const free = (build, id) => {
    const part = build.assembly.parts.find((p) => p.id === id);
    return part.type !== "valve" && partJoints(build.assembly, id).every((joint) => joint.type === "axis");
};

/**
 * Joins a part's point {part, point} to a target: another point {part, point} (a pin, or the same shaft for two
 * axles) or a fixed point on the frame {ground: [x, y]}. A part without joints is first moved there, so it snaps
 * into place.
 */
export const connect = (build, source, target) => {
    const p = parts(build.assembly);
    let current = build;
    let joint;
    if (target.ground) {
        if (p[source.part].type === "valve") return {error: "Ventil je že pritrjen na ogrodje."};
        if (free(current, source.part)) {
            const [x, y] = partPoint(p[source.part], current.state.poses[source.part], source.point);
            current = movePartBy(current, source.part, [target.ground[0] - x, target.ground[1] - y]);
        }
        joint = {type: "ground", a: source, at: target.ground};
    } else {
        if (target.part === source.part) return {error: "Točki sta na istem delu."};
        //Two axles on one spot share a shaft and turn together
        const shaft = isWheel(p[source.part]) && isWheel(p[target.part]);
        const [mover, fixed] = free(current, source.part) ? [source, target] : free(current, target.part) ? [target, source] : [null];
        if (mover) {
            const [x, y] = partPoint(p[mover.part], current.state.poses[mover.part], mover.point);
            const [tx, ty] = partPoint(p[fixed.part], current.state.poses[fixed.part], fixed.point);
            current = movePartBy(current, mover.part, [tx - x, ty - y]);
        }
        joint = {type: shaft ? "weld" : "pin", a: source, b: target};
    }
    const [id, assembly] = nextId(current.assembly, "j");
    //A shaft is first put together as a pin and locked where the wheels end up, as they may roll on the way
    let result = resolve({...assembly, joints: [...assembly.joints, {id, ...joint, type: joint.type === "weld" ? "pin" : joint.type}]},
        current.state);
    if (joint.type === "weld") {
        const locked = capture({id, ...joint}, result.assembly, result.state.poses);
        result = resolve({...result.assembly, joints: result.assembly.joints.map((j) => (j.id === id ? locked : j))}, result.state);
    }
    if (!holds(result)) return {error: "Tako se mehanizma ne da sestaviti: deli bi se zagozdili."};
    return mountContacts(result);
};

/**
 * Bearing dropped at a world position [m]: the nearest wheel axle or other point within reach is fixed to the frame
 * where it is now. A wheel then turns about a fixed centre while its rim rolls on what it touches.
 */
export const addBearing = (build, [x, y], reach = 0.05) => {
    let best = null, distance = reach;
    for (const part of build.assembly.parts.filter((p) => p.type !== "valve")) {
        for (const point of partPoints(part)) {
            //Axles win over bar and float points close by
            const d = Math.hypot(...partPoint(part, build.state.poses[part.id], point.id).map((v, i) => v - [x, y][i])) *
                (point.id === "axle" ? 0.5 : 1);
            if (d < distance) [best, distance] = [{part: part.id, point: point.id}, d];
        }
    }
    if (!best) return {error: "Ležaj spusti na os kolesa ali na točko letve oziroma plovca."};
    if (build.assembly.joints.some((j) => j.type === "ground" && j.a.part === best.part && j.a.point === best.point)) {
        return {error: "Ta točka je že v ležaju."};
    }
    const part = build.assembly.parts.find((p) => p.id === best.part);
    return connect(build, best, {ground: partPoint(part, build.state.poses[best.part], best.point)});
};

//Takes a wheel axle out of its bearings
export const removeBearing = (build, id) =>
    resolve({...build.assembly, joints: build.assembly.joints.filter((j) => !(j.type === "ground" && j.a.part === id))}, build.state);

export const addBelt = (build, a, b) => {
    if (a === b) return {error: "Jermen mora povezati dve različni kolesi."};
    if (build.assembly.joints.some((j) => j.type === "belt" && [j.a, j.b].includes(a) && [j.a, j.b].includes(b))) {
        return {error: "Ti kolesi že povezuje jermen."};
    }
    const [id, assembly] = nextId(build.assembly, "j");
    const joint = capture({id, type: "belt", a, b, crossed: false}, assembly, build.state.poses);
    return resolve({...assembly, joints: [...assembly.joints, joint]}, build.state);
};

//Wheels on one shaft (axles joined), which move together
const shaft = (assembly, id) => {
    const group = new Set([id]);
    let grown = true;
    while (grown) {
        grown = false;
        for (const j of assembly.joints) {
            if ((j.type !== "pin" && j.type !== "weld") || j.a.point !== "axle" || j.b.point !== "axle") continue;
            const [a, b] = [j.a.part, j.b.part];
            if (group.has(a) !== group.has(b)) {
                group.add(group.has(a) ? b : a);
                grown = true;
            }
        }
    }
    return [...group];
};

/**
 * Friction contact chosen by the student: the rim of a wheel rolls on the face of a bar it is next to, or on the rim
 * of another wheel. The wheel's shaft moves across to touch, with its mounts on the frame; the valve stays and the
 * other wheel comes to it instead.
 */
export const addContact = (build, wheelId, otherId) => {
    const p = parts(build.assembly);
    let [wheel, other] = [p[wheelId], p[otherId]];
    if (!isWheel(wheel)) return {error: "Stik se začne pri kolesu ali ventilu."};
    if (wheelId === otherId || !(other.type === "bar" || isWheel(other))) return {error: "Kolo se lahko kotali po letvi ali po drugem kolesu."};
    if (build.assembly.joints.some((j) => j.type === "contact" && [j.a, j.b].includes(wheelId) && [j.a, j.b].includes(otherId))) {
        return {error: "Ta dva dela se že dotikata."};
    }
    if (wheel.type === "valve" && isWheel(other)) [wheel, other] = [other, wheel];
    if (wheel.type === "valve") return {error: "Ventil se ne premakne: kolo naj pride k njemu."};
    const {poses} = build.state;
    const gap = rimGap(wheel, poses[wheel.id], other, poses[other.id]);
    if (gap === null) return {error: `${wheel.name} ni ob letvi: postavi ga ob njeno dolžino.`};
    //Direction from the wheel towards the face or rim it should touch
    const w = poses[wheel.id], o = poses[other.id];
    let toward;
    if (other.type === "bar") {
        const side = Math.sign(barFrame(o, [w.x, w.y])[1]) || 1;
        toward = [side * Math.sin(o.a), -side * Math.cos(o.a)];
    } else {
        const d = Math.hypot(o.x - w.x, o.y - w.y) || 1;
        toward = [(o.x - w.x) / d, (o.y - w.y) / d];
    }
    const shift = [toward[0] * gap, toward[1] * gap];
    const group = shaft(build.assembly, wheel.id);
    let current = build;
    for (const id of group) current = movePartBy(current, id, shift);
    current = {...current, assembly: {...current.assembly, joints: current.assembly.joints.map((j) => (j.type === "ground" &&
        group.includes(j.a.part) ? {...j, at: [j.at[0] + shift[0], j.at[1] + shift[1]]} : j))}};
    const [id, assembly] = nextId(current.assembly, "j");
    const joint = capture({id, type: "contact", a: wheel.id, b: other.id}, assembly, current.state.poses);
    const result = resolve({...assembly, joints: [...assembly.joints, joint]}, current.state);
    return holds(result) ? result : {error: "Dela se ne moreta dotikati, ne da bi se mehanizem zagozdil."};
};

/**
 * Motion axis of a bar, always the bar's own line: on (true) through the bar's middle, off (null), or moved and
 * turned {at, angle}. Moving the line moves the bar across with it; turning it turns the bar about its sleeve.
 */
export const setAxis = (build, barId, change) => {
    const axis = barAxis(build.assembly, barId);
    if (!axis && change && change !== true) return {error: "Letev nima osi gibanja."};
    if (change?.angle !== undefined) {
        const moved = change.at ? setAxis(build, barId, {at: change.at}) : build;
        if (moved.error) return moved;
        return updatePart(moved, barId, {angle: moved.state.poses[barId].a + change.angle - axis.angle});
    }
    let assembly = {...build.assembly, joints: build.assembly.joints.filter((j) => j !== axis)};
    if (change === true) {
        const part = assembly.parts.find((q) => q.id === barId), pose = build.state.poses[barId];
        const [id, numbered] = nextId(assembly, "j");
        assembly = {...numbered, joints: [...numbered.joints, {id, ...newAxis(barId, pose, worldPoint(pose, [part.length / 2, 0]), pose.a)}]};
    } else if (change) {
        assembly = {...assembly, joints: [...assembly.joints, {...axis, ...change}]};
    }
    const result = resolve(assembly, build.state);
    return holds(result) ? result : {error: "Letev se ne more premakniti na to os, ne da bi se mehanizem zagozdil."};
};

/**
 * Changes part parameters [m] or its angle [rad]. A changed size remounts the part: its contacts come off and
 * are mounted again where the rims still touch; other joints keep their meaning at the new size.
 */
export const updatePart = (build, id, changes) => {
    const part = build.assembly.parts.find((p) => p.id === id);
    let {assembly, state} = build;
    if (changes.angle !== undefined) {
        //A bar on an axis turns about its sleeve and takes the axis along
        const axis = barAxis(assembly, id);
        const current = state.poses[id], turn = changes.angle - current.a;
        const [cx, cy] = axis ? axis.at : [current.x, current.y];
        const c = Math.cos(turn), sn = Math.sin(turn);
        const pose = {x: cx + (current.x - cx) * c - (current.y - cy) * sn, y: cy + (current.x - cx) * sn + (current.y - cy) * c,
            a: changes.angle};
        if (axis) assembly = replaceJoint(assembly, {...axis, angle: axis.angle + turn, barAngle: axis.barAngle + turn});
        const placed = {...state, poses: {...state.poses, [id]: pose}};
        const turned = free(build, id) ? resolve(assembly, placed) : resolve(assembly, placed, {drag: {id, pose}});
        return holds(turned) ? mountContacts(resolve(turned.assembly, turned.state)) : {error: "Tako se dela ne da zasukati."};
    }
    const resized = {...part, ...changes};
    const points = partPoints(resized).map((point) => point.id);
    //Joints at points the shorter bar no longer has move to its end
    const keep = (end) => (end.part === id && !points.includes(end.point) ? {...end, point: points.at(-1)} : end);
    assembly = {
        ...assembly,
        parts: assembly.parts.map((p) => (p.id === id ? resized : p)),
        joints: assembly.joints.filter((j) => !(j.type === "contact" && [j.a, j.b].includes(id)))
            .map((j) => (j.type === "pin" || j.type === "weld" || j.type === "ground" ? {...j, a: keep(j.a), ...(j.b && {b: keep(j.b)})} : j)),
    };
    assembly = recapture(assembly, state.poses, id);
    const result = resolve(assembly, state);
    return holds(result) ? mountContacts(result) : {error: "S to velikostjo se mehanizma ne da sestaviti."};
};

export const updateJoint = (build, id, changes) => {
    const assembly = {...build.assembly, joints: build.assembly.joints.map((j) => (j.id === id
        ? capture({...j, ...changes}, build.assembly, build.state.poses) : j))};
    const result = resolve(assembly, build.state);
    return holds(result) ? result : {error: "Te spremembe se ne da sestaviti."};
};

export const removeJoint = (build, id) =>
    resolve({...build.assembly, joints: build.assembly.joints.filter((j) => j.id !== id)}, build.state);

export const removePart = (build, id) => {
    if (id === "valve") return build;
    const assembly = {
        ...build.assembly,
        parts: build.assembly.parts.filter((p) => p.id !== id),
        joints: build.assembly.joints.filter((j) => !partJoints({joints: [j]}, id).length),
    };
    const poses = {...build.state.poses};
    delete poses[id];
    return resolve(assembly, {...build.state, poses});
};

//The student closes the valve and tightens its pulley: the valve closes at the current level from now on
export const closeValve = (build) => ({...build, state: mechanismState(build.state.poses, build.state.level, build.state.poses.valve.a)});

//Water moved by hand before a run
export const moveWater = (build, level) => ({...build, state: settle(build.assembly, build.state, level)});

/**
 * Ready mechanism, as on the measuring pages: a bar on the float sliding vertically turns a friction wheel,
 * a pulley on its shaft drives the valve by an open belt. Kp = 2·r_pulley / (π · r_wheel · r_valve).
 */
export const exampleBuild = (level, {wheel = 0.1, pulley = 0.05, valve = 0.08} = {}) => {
    const x = 2.17;
    const steps = [
        (b) => addPart(b, "float", [x, level + floatHeight / 2]),
        (b) => updatePart(b, "p1", {width: 0.5}),
        (b) => addPart(b, "bar", [x, level + floatHeight + 0.6]),
        (b) => updatePart(b, "p2", {length: 1.3}),
        (b) => connect(b, {part: "p2", point: "0"}, {part: "p1", point: "center"}),
        //The wheel axle is fixed a little off the bar, then the wheel is set against it
        (b) => addPart(b, "wheel", [x + barWidth / 2 + wheel + 0.05, 1.35]),
        (b) => updatePart(b, "p3", {radius: wheel}),
        (b) => connect(b, {part: "p3", point: "axle"}, {ground: [x + barWidth / 2 + wheel + 0.05, 1.35]}),
        (b) => addContact(b, "p3", "p2"),
        (b) => addPart(b, "wheel", [x + barWidth / 2 + wheel, 1.35]),
        (b) => updatePart(b, "p4", {radius: pulley}),
        (b) => connect(b, {part: "p4", point: "axle"}, {part: "p3", point: "axle"}),
        (b) => updatePart(b, "valve", {radius: valve}),
        (b) => addBelt(b, "p4", "valve"),
        closeValve,
    ];
    return steps.reduce((b, step) => {
        const next = step(b);
        if (next.error) throw new Error(next.error);
        return next;
    }, emptyBuild(level));
};

//The student's mechanism survives a reload of the page
export const loadBuild = (level) => {
    try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey));
        if (saved?.assembly?.parts && saved.state?.poses) {
            //The first version had separate guides; bars have their own motion axis now
            const assembly = {...saved.assembly, parts: saved.assembly.parts.filter((part) => part.type !== "guide"),
                joints: saved.assembly.joints.filter((joint) => joint.type !== "guide")};
            return {assembly, state: settle(assembly, saved.state, level)};
        }
    } catch {
        //No storage or a broken entry: start empty
    }
    return emptyBuild(level);
};

export const saveBuild = (build) => {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(build));
    } catch {
        //Storage blocked: the mechanism lasts until the page is closed
    }
};
