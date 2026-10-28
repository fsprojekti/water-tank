import {addBearing, addBelt, addContact, addPart, closeValve, connect, detachPart, emptyBuild, exampleBuild, moveWater, setAxis, updateJoint, updatePart} from "./assembly";
import {analyse, settle} from "./mechanism";
import {createModel, modelReducer, RESET, RUN, SET_INPUT, SET_STATUS, TICK} from "./reducer";

const kpOf = ({wheel = 0.1, pulley = 0.05, valve = 0.08} = {}) => 2 * pulley / (Math.PI * wheel * valve);

test("the example mechanism is a P controller closing at the level it was tightened", () => {
    const build = exampleBuild(0.75);
    const result = analyse(build.assembly, build.state);
    expect(result.issues).toEqual([]);
    expect(result.kp).toBeCloseTo(kpOf(), 2);
    expect(result.h0).toBeCloseTo(0.75, 3);
    expect(build.state.opening).toBe(0);
    const lower = settle(build.assembly, build.state, 0.65);
    expect(lower.opening).toBeCloseTo(kpOf() * 0.1, 3);
});

test("Kp follows the friction wheel and pulley sizes", () => {
    const sizes = {wheel: 0.05, pulley: 0.04, valve: 0.06};
    const build = exampleBuild(0.6, sizes);
    expect(analyse(build.assembly, build.state).kp).toBeCloseTo(kpOf(sizes), 1);
});

test("a crossed belt opens the valve with rising water", () => {
    const build = exampleBuild(0.75);
    const belt = build.assembly.joints.find((j) => j.type === "belt");
    const crossed = updateJoint(build, belt.id, {crossed: true});
    const result = analyse(crossed.assembly, crossed.state);
    expect(result.positive).toBe(true);
    expect(result.issues.join(" ")).toMatch(/Pozitivna povratna zanka/);
    expect(settle(crossed.assembly, crossed.state, 0.8).opening).toBeGreaterThan(0.1);
});

test("a bar without its motion axis is loose", () => {
    const build = exampleBuild(0.75);
    const result = analyse(setAxis(build, "p2", null).assembly, build.state);
    expect(result.loose).toContain("p2");
    expect(result.issues.join(" ")).toMatch(/ni določen/);
});

test("the valve pulley slips at the stops and the closing level follows", () => {
    const build = exampleBuild(0.75);
    const low = moveWater(build, 0.3);
    expect(low.state.opening).toBe(1);
    //Now the valve closes 1/Kp above the lowest level instead of at 0.75
    const back = moveWater(low, 0.5);
    expect(back.state.opening).toBeCloseTo(1 - kpOf() * 0.2, 2);
    expect(analyse(back.assembly, back.state).h0).toBeCloseTo(0.3 + 1 / kpOf(), 2);
});

test("a float on a lever works too, and its Kp follows the lever length", () => {
    //Cistern style: the float hangs on the end of a lever, a pulley on the lever pivot drives the valve
    const steps = [
        (b) => addPart(b, "bar", [2.3, 1.0]),
        (b) => setAxis(b, "p1", null),
        (b) => updatePart(b, "p1", {angle: 0}),
        (b) => connect(b, {part: "p1", point: "60"}, {ground: [2.6, 1.0]}),
        (b) => addPart(b, "float", [2.0, 0.9]),
        (b) => connect(b, {part: "p2", point: "center"}, {part: "p1", point: "0"}),
        (b) => addPart(b, "wheel", [2.6, 1.0]),
        (b) => connect(b, {part: "p3", point: "axle"}, {part: "p1", point: "60"}),
        (b) => updateJoint(b, b.assembly.joints.at(-1).id, {type: "weld"}),
        (b) => addBelt(b, "p3", "valve"),
        closeValve,
    ];
    const build = steps.reduce((b, step) => {
        const next = step(b);
        expect(next.error).toBeUndefined();
        return next;
    }, emptyBuild(0.75));
    const result = analyse(build.assembly, build.state);
    expect(result.loose).toEqual([]);
    expect(result.issues.join(" ")).not.toMatch(/zatakne|ni določen/);
    const lever = build.state.poses.p1;
    expect(Math.abs(result.kp)).toBeCloseTo(0.08 / 0.06 / (0.6 * Math.cos(lever.a)) / (Math.PI / 2), 1);
});

test("a part comes off everything it is joined to, keeping a bar's motion axis", () => {
    const build = detachPart(exampleBuild(0.75), "p2");
    expect(build.assembly.joints.filter((j) => [j.a?.part, j.b?.part, j.a, j.b, j.bar].includes("p2")).map((j) => j.type))
        .toEqual(["axis"]);
    expect(analyse(build.assembly, build.state).issues.join(" ")).toMatch(/ne odziva/);
});

test("joints that can't be assembled are refused", () => {
    const build = exampleBuild(0.75);
    //The wheel axle is fixed; fixing it somewhere else would jam the mechanism
    expect(connect(build, {part: "p3", point: "axle"}, {ground: [3, 1.5]}).error).toBeDefined();
    expect(addBelt(build, "p4", "valve").error).toBeDefined();
    expect(addContact(build, "p3", "p2").error).toBeDefined();
});

test("the built example regulates the tank like the P page with the same Kp", () => {
    const run = (model) => {
        let result = modelReducer(model, {type: SET_STATUS, status: RUN});
        for (let i = 0; i < 600; i++) result = modelReducer(result, {type: TICK});
        return result;
    };
    const built = run(modelReducer(createModel("labBuild"), {type: SET_INPUT, name: "build", value: exampleBuild(0.75)}));
    const reference = run({...createModel("labP"), kp: kpOf()});
    expect(built.level).toBeCloseTo(reference.level, 3);
    expect(built.history.valve.at(-1)[1]).toBeCloseTo(reference.history.valve.at(-1)[1], 1);
    //A new run starts from the mechanism as it was built
    const reset = modelReducer(built, {type: SET_STATUS, status: RESET});
    expect(reset.mechanism).toBe(built.mechanismStart);
    expect(modelReducer(built, {type: SET_INPUT, name: "build", value: exampleBuild(0.5)})).toBe(built);
});

test("a wheel fixed on the frame rolls on another wheel's rim once set against it, turning it the other way", () => {
    //Instead of the belt, a friction wheel on the pulley shaft drives the valve pulley rim directly
    let build = exampleBuild(0.75);
    const belt = build.assembly.joints.find((j) => j.type === "belt");
    build = {...build, assembly: {...build.assembly, joints: build.assembly.joints.filter((j) => j !== belt)}};
    build = addPart(build, "wheel", [1.3, 1.18]);
    expect(build.error).toBeUndefined();
    build = connect(build, {part: "p5", point: "axle"}, {ground: [1.3, 1.18]});
    build = addContact(build, "p5", "valve");
    expect(build.error).toBeUndefined();
    //Moved across with its mount until the rims touch
    const {p5, valve} = build.state.poses;
    expect(Math.hypot(p5.x - valve.x, p5.y - valve.y)).toBeCloseTo(0.08 + 0.08, 4);
    expect(build.assembly.joints.find((j) => j.type === "ground" && j.a.part === "p5").at[0]).toBeCloseTo(p5.x, 6);
    //An open belt from the pulley to the new wheel: the rims turn the valve the other way than the belt did
    build = addBelt(build, "p4", "p5");
    build = closeValve(build);
    expect(analyse(build.assembly, build.state).positive).toBe(true);
});

test("turning a bar's motion axis turns the bar about its sleeve, so it still slides only along itself", () => {
    let build = addPart(emptyBuild(0.75), "bar", [2.5, 1.4]);
    const sleeve = build.assembly.joints[0].at;
    build = setAxis(build, "p1", {angle: Math.PI / 4});
    expect(build.error).toBeUndefined();
    const axis = build.assembly.joints[0], pose = build.state.poses.p1;
    expect(axis.angle).toBeCloseTo(Math.PI / 4, 9);
    expect(pose.a).toBeCloseTo(Math.PI / 4, 9);
    expect(axis.at).toEqual(sleeve);
    expect(analyse(build.assembly, build.state).loose).toEqual(["p1"]);
});

test("a bearing dropped near a wheel fixes its axle, so the wheel turns in place as the bar slides by", () => {
    let build = addPart(emptyBuild(0.75), "float", [2.2, 0.9]);
    build = addPart(build, "bar", [2.2, 1.3]);
    build = connect(build, {part: "p2", point: "0"}, {part: "p1", point: "center"});
    build = addPart(build, "wheel", [2.2 + 0.0125 + 0.08, 1.3]);
    //Dropped against the bar it only touches; the contact tool makes it roll there
    expect(build.assembly.joints.some((j) => j.type === "contact")).toBe(false);
    build = addContact(build, "p3", "p2");
    expect(addBearing(build, [3.5, 1.6]).error).toBeDefined();
    build = addBearing(build, [2.3, 1.31]);
    expect(build.error).toBeUndefined();
    const centre = build.state.poses.p3;
    const lower = moveWater(build, 0.65);
    expect(lower.state.poses.p3.x).toBeCloseTo(centre.x, 6);
    expect(lower.state.poses.p3.y).toBeCloseTo(centre.y, 6);
    //Rolled 10 cm along the bar: a tenth of a metre over the radius
    expect(lower.state.poses.p3.a - centre.a).toBeCloseTo(0.1 / 0.08, 3);
    expect(analyse(lower.assembly, lower.state).loose).toEqual([]);
});

test("a wheel stands still once the bar has slid past it, and rolls on when it comes back", () => {
    //Short bar on the float, wheel in a bearing near its top end: below 0.70 m the bar's top drops past the wheel
    let build = addPart(emptyBuild(0.75), "float", [2.2, 0.9]);
    build = addPart(build, "bar", [2.2, 1.3]);
    build = connect(build, {part: "p2", point: "0"}, {part: "p1", point: "center"});
    build = addPart(build, "wheel", [2.2 + 0.0125 + 0.08, 1.42]);
    build = addContact(build, "p3", "p2");
    build = addBearing(build, [2.2925, 1.42]);
    expect(build.error).toBeUndefined();
    const angle = (level) => moveWater(build, level).state.poses.p3.a;
    const top = 0.75 + 0.12 + 0.6 - 1.42;
    expect(angle(0.6)).toBeCloseTo(angle(0.75 - top), 6);
    expect(angle(0.4)).toBeCloseTo(angle(0.6), 6);
    expect(Math.abs(angle(0.73) - build.state.poses.p3.a)).toBeGreaterThan(0.1);
    //Down past the wheel and back up: the wheel ends where it started
    const back = moveWater(moveWater(build, 0.5), 0.75);
    expect(back.state.poses.p3.a).toBeCloseTo(build.state.poses.p3.a, 6);
});
