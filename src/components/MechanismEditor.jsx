import {useRef, useState} from "react";
import config from "../config";
import colors from "./pipeColors";
import {BeltSpans, FixedMount, Pulley} from "./mechanismParts";
import {barWidth, floatHeight, fromPx, isWheel, partPoint, partPoints, toPx} from "../simulation/mechanism";
import {barAxis, connect, contactCandidate, dragPart, releasePart, setAxis} from "../simulation/assembly";
import schemePoint from "./schemePoint";

const k = config.render.m2Px;
//SVG turns clockwise, world angles counterclockwise [deg]
const svgAngle = (a) => -a * 180 / Math.PI;
//Pointer distances on the scheme [Px]
const snapPx = 12;
const clickPx = 4;
const selectColor = "#1c7ed6";
const problemColor = "#e03131";
//Faces and rims a wheel can roll on, shown while choosing a contact
const surfaceColor = "#f08c00";
//Turning handle of a motion axis, this far beyond the bar's end [m]
const handleM = 0.08;
//A dragged rim this close to a bar face or another rim [Px] offers a contact
const contactPx = 14;

const unit = ([x, y]) => {
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
};

//Distance [m] from a point to a bar's centre line, and the bar point nearest to it
const nearBar = (part, pose, [x, y]) => {
    const c = Math.cos(pose.a), s = Math.sin(pose.a);
    const along = Math.min(Math.max((x - pose.x) * c + (y - pose.y) * s, 0), part.length);
    const distance = Math.hypot(pose.x + along * c - x, pose.y + along * s - y);
    const point = partPoints(part).reduce((best, p) => (Math.abs(p.at[0] - along) < Math.abs(best.at[0] - along) ? p : best));
    return {distance, point: point.id};
};

/**
 * What a dragged point {part, point} would join when released at a world position: another point or a bar (its
 * nearest point). Fixing to the frame is done with a bearing from the palette.
 */
const dropTarget = ({assembly, state}, source, at) => {
    const tolerance = snapPx / k;
    let best = null, distance = tolerance;
    for (const part of assembly.parts) {
        if (part.id === source.part) continue;
        for (const point of partPoints(part)) {
            const [x, y] = partPoint(part, state.poses[part.id], point.id);
            const d = Math.hypot(x - at[0], y - at[1]);
            if (d < distance) [best, distance] = [{part: part.id, point: point.id}, d];
        }
    }
    if (best) return best;
    for (const part of assembly.parts.filter((p) => p.type === "bar" && p.id !== source.part)) {
        const near = nearBar(part, state.poses[part.id], at);
        if (near.distance < tolerance) return {part: part.id, point: near.point};
    }
    return null;
};

//Contact point [m] of a friction contact
const contactPoint = (joint, parts, poses) => {
    const wheel = parts[joint.a], w = poses[joint.a], o = poses[joint.b];
    if (parts[joint.b].type === "bar") {
        return [w.x + joint.side * wheel.radius * Math.sin(o.a), w.y - joint.side * wheel.radius * Math.cos(o.a)];
    }
    const [ux, uy] = unit([o.x - w.x, o.y - w.y]);
    return [w.x + ux * wheel.radius, w.y + uy * wheel.radius];
};

//Bearing on the frame: a triangle from the fixed point down to a hatched base, the point itself as a pin
export const GroundSymbol = ({x, y}) => (
    <g>
        <polygon points={`${x},${y} ${x - 11},${y + 20} ${x + 11},${y + 20}`} fill={"#e9ecef"} stroke={colors.metal}
                 strokeWidth={2} strokeLinejoin={"round"}/>
        <line x1={x - 16} y1={y + 20} x2={x + 16} y2={y + 20} stroke={colors.metal} strokeWidth={2.5}/>
        {[-14, -7, 0, 7, 14].map((dx) => <line key={dx} x1={x + dx} y1={y + 20} x2={x + dx - 5} y2={y + 27}
                                               stroke={colors.metal} strokeWidth={1.4}/>)}
        <circle cx={x} cy={y} r={4.5} fill={"white"} stroke={colors.metal} strokeWidth={2}/>
    </g>
);

//Part drawn at its pose; outline marks a selected (blue) or problem (red) part
const PartShape = ({part, pose, outline}) => {
    const [x, y] = toPx([pose.x, pose.y]);
    const transform = `translate(${x} ${y}) rotate(${svgAngle(pose.a)})`;
    const stroke = outline ? {stroke: outline, strokeWidth: 2.5, strokeDasharray: "6 3"} : {};
    if (part.type === "float") {
        return <g transform={transform}>
            <rect x={-part.width / 2 * k} y={-floatHeight * k} width={part.width * k} height={floatHeight * k} rx={5}
                  fill={"rgb(213, 68, 54)"} {...stroke}/>
        </g>;
    }
    if (part.type === "bar") {
        return <g transform={transform}>
            <rect x={-2} y={-barWidth / 2 * k} width={part.length * k + 4} height={barWidth * k} rx={2}
                  fill={colors.steel} stroke={outline ?? colors.metal} strokeWidth={outline ? 2.5 : 1.5}
                  strokeDasharray={outline ? "6 3" : undefined}/>
        </g>;
    }
    if (part.type === "wheel") {
        return <g>
            <Pulley x={x} y={y} r={part.radius * k} angle={-pose.a}/>
            {outline && <circle cx={x} cy={y} r={part.radius * k + 5} fill={"none"} {...stroke}/>}
        </g>;
    }
    //The valve and its pulley are drawn with the intake pipe; here only a handle to select it
    return <g>
        <circle cx={x} cy={y} r={Math.max(part.radius * k, 20)} fill={"transparent"}/>
        {outline && <circle cx={x} cy={y} r={Math.max(part.radius * k, 20) + 6} fill={"none"} {...stroke}/>}
        <text x={x} y={y - Math.max(part.radius * k, 32) - 8} textAnchor={"middle"} fontSize={13} fill={colors.pipeDark}>
            odpira ↺</text>
    </g>;
};

//Distances along an axis from its anchor to both ends of its bar [m], nearer first
const barReach = (axis, bar, pose) => [0, bar.length].map((d) =>
    (pose.x + d * Math.cos(pose.a) - axis.at[0]) * Math.cos(axis.angle) + (pose.y + d * Math.sin(pose.a) - axis.at[1]) * Math.sin(axis.angle))
    .sort((a, b) => a - b);

const {left: viewLeft, right: viewRight} = config.render.viewPx;
const visible = ([x, y]) => x > viewLeft + 10 && x < viewRight - 10 && y > 15 && y < 845;

//Motion axis of a bar: a thin dashed line fixed to the frame, along which the bar slides
const AxisMark = ({axis}) => {
    const [x, y] = toPx(axis.at);
    const dx = Math.cos(axis.angle) * k, dy = -Math.sin(axis.angle) * k;
    return <line x1={x - dx * 6} y1={y - dy * 6} x2={x + dx * 6} y2={y + dy * 6} stroke={"#868e96"} strokeWidth={1}
                 strokeDasharray={"6 5"} pointerEvents={"none"}/>;
};

//Motion axis of the selected bar across the scheme, drawn under the parts: drag the line to move it
const AxisLine = ({axis, onMove}) => {
    const [x, y] = toPx(axis.at);
    const dx = Math.cos(axis.angle) * k, dy = -Math.sin(axis.angle) * k;
    const ends = {x1: x - dx * 6, y1: y - dy * 6, x2: x + dx * 6, y2: y + dy * 6};
    return <g>
        <line {...ends} stroke={selectColor} strokeWidth={1.5} strokeDasharray={"8 5"} pointerEvents={"none"}/>
        <line {...ends} stroke={"transparent"} strokeWidth={14} style={{cursor: "move"}} onPointerDown={onMove}>
            <title>Premakni os gibanja</title></line>
    </g>;
};

/**
 * Round handle on the axis just past the bar's far end, or past the other end when that one is off the scheme, on top
 * of everything: drag it to turn the bar about the axis anchor. flip tells the handle is behind the anchor.
 */
const AxisHandle = ({axis, bar, pose, onTurn}) => {
    const dir = [Math.cos(axis.angle), Math.sin(axis.angle)];
    const [near, far] = barReach(axis, bar, pose);
    const at = (d) => toPx([axis.at[0] + dir[0] * d, axis.at[1] + dir[1] * d]);
    const flip = !visible(at(Math.max(far, 0) + handleM)) && visible(at(Math.min(near, 0) - handleM));
    const [x, y] = toPx(axis.at), [hx, hy] = at(flip ? Math.min(near, 0) - handleM : Math.max(far, 0) + handleM);
    return <g>
        <line x1={x} y1={y} x2={hx} y2={hy} stroke={selectColor} strokeWidth={2} pointerEvents={"none"}/>
        <circle cx={hx} cy={hy} r={8} fill={"white"} stroke={selectColor} strokeWidth={2.5} style={{cursor: "grab"}}
                onPointerDown={(event) => onTurn(event, flip)}><title>Zasukaj letev</title></circle>
    </g>;
};

//Faces of a bar and rims of wheels a wheel can roll on
const Surfaces = ({part, pose, first}) => {
    const color = first ? selectColor : surfaceColor;
    if (part.type === "bar") {
        const [x, y] = toPx([pose.x, pose.y]);
        return <g transform={`translate(${x} ${y}) rotate(${svgAngle(pose.a)})`} pointerEvents={"none"}>
            {[-1, 1].map((side) => <line key={side} x1={0} y1={side * (barWidth / 2 * k + 1.5)} x2={part.length * k}
                                         y2={side * (barWidth / 2 * k + 1.5)} stroke={color} strokeWidth={3}/>)}
        </g>;
    }
    const [x, y] = toPx([pose.x, pose.y]);
    return <circle cx={x} cy={y} r={part.radius * k + 2} fill={"none"} stroke={color} strokeWidth={3} pointerEvents={"none"}/>;
};

const Belt = ({joint, parts, poses, selected}) => {
    const a = parts[joint.a], b = parts[joint.b];
    const [ax, ay] = toPx([poses[a.id].x, poses[a.id].y]), [bx, by] = toPx([poses[b.id].x, poses[b.id].y]);
    const ends = {a: {x: ax, y: ay, r: a.radius * k}, b: {x: bx, y: by, r: b.radius * k}};
    const [nx, ny] = unit([by - ay, ax - bx]);
    const spans = joint.crossed
        ? [1, -1].map((side) => [ax + side * nx * ends.a.r, ay + side * ny * ends.a.r, bx - side * nx * ends.b.r, by - side * ny * ends.b.r])
        : null;
    return <g>
        {spans ? spans.map(([x1, y1, x2, y2]) => <line key={x1} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.belt} strokeWidth={4}/>)
            : <BeltSpans a={ends.a} b={ends.b}/>}
        {selected && <line x1={ax} y1={ay} x2={bx} y2={by} stroke={selectColor} strokeWidth={2} strokeDasharray={"6 3"}/>}
    </g>;
};

/**
 * Student's mechanism drawn over the tank. While editable: drag parts to move them (joints follow), drag a
 * point (○) onto another point to join them or into empty space to fix it to the frame, drag a selected bar's
 * motion axis to move or turn it. With a tool (belt, contact) clicked parts go to onToolPick. Changes go to
 * onChange as a new build or {error}.
 */
const MechanismEditor = ({build, analysis, editable, selected, onSelect, tool, onToolPick, onChange, placing, svgRef}) => {
    const [draft, setDraft] = useState(null);
    const [link, setLink] = useState(null);
    //Contact the dragged part would make if released now
    const [snap, setSnap] = useState(null);
    const gesture = useRef(null);
    const shown = draft ?? build;
    const {assembly, state} = shown;
    const parts = Object.fromEntries(assembly.parts.map((part) => [part.id, part]));
    const problems = new Set([...(analysis?.unattached ?? []), ...(analysis?.loose ?? [])]);

    const world = (event) => fromPx(schemePoint(svgRef.current, event.clientX, event.clientY));
    const begin = (event, start) => {
        if (!editable || event.button > 0) return;
        //No text selection or page scrolling while dragging
        event.preventDefault();
        event.stopPropagation();
        svgRef.current.setPointerCapture(event.pointerId);
        gesture.current = {...start, from: [event.clientX, event.clientY], at: world(event), moved: false};
    };
    const pressPart = (event, part) => {
        if (!editable) return;
        if (tool) {
            event.stopPropagation();
            onToolPick(part.id);
            return;
        }
        onSelect({kind: "part", id: part.id});
        begin(event, {kind: "part", id: part.id, pose: state.poses[part.id]});
    };
    const move = (event) => {
        const g = gesture.current;
        if (!g) return;
        if (!g.moved && Math.hypot(event.clientX - g.from[0], event.clientY - g.from[1]) < clickPx) return;
        g.moved = true;
        const at = world(event);
        if (g.kind === "part") {
            const {pose} = g;
            const next = dragPart(draft ?? build, g.id, {...pose, x: pose.x + at[0] - g.at[0], y: pose.y + at[1] - g.at[1]});
            setDraft(next);
            setSnap(contactCandidate(next, g.id, contactPx / k));
        } else if (g.kind === "axis") {
            //Moved with the pointer, or turned towards it in steps of 5°
            const step = Math.PI / 36;
            const change = g.turn
                ? {angle: Math.round((Math.atan2(at[1] - g.axis.at[1], at[0] - g.axis.at[0]) + (g.flip ? Math.PI : 0)) / step) * step}
                : {at: [g.axis.at[0] + at[0] - g.at[0], g.axis.at[1] + at[1] - g.at[1]]};
            const result = setAxis(build, g.axis.bar, change);
            if (!result.error) setDraft(result);
        } else {
            setLink({from: partPoint(parts[g.part], state.poses[g.part], g.point), to: at,
                target: dropTarget(build, {part: g.part, point: g.point}, at)});
        }
    };
    const end = (event) => {
        const g = gesture.current;
        gesture.current = null;
        if (!g) return;
        if (g.kind === "part" && g.moved && draft) onChange(releasePart(draft, g.id, snap));
        if (g.kind === "axis" && g.moved && draft) onChange(draft);
        if (g.kind === "point") {
            const target = g.moved ? dropTarget(build, {part: g.part, point: g.point}, world(event)) : null;
            if (target) onChange(connect(build, {part: g.part, point: g.point}, target));
            else if (!g.moved) onSelect({kind: "part", id: g.part});
        }
        setDraft(null);
        setLink(null);
        setSnap(null);
    };

    const outline = (id) => (selected?.kind === "part" && selected.id === id ? selectColor
        : problems.has(id) ? problemColor : undefined);
    const order = ["float", "bar", "wheel", "valve"];
    const sorted = [...assembly.parts].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    const selectJoint = (event, joint) => {
        if (!editable) return;
        event.stopPropagation();
        onSelect({kind: "joint", id: joint.id});
    };
    const jointSelected = (joint) => selected?.kind === "joint" && selected.id === joint.id;
    const selectedAxis = selected?.kind === "part" ? barAxis(assembly, selected.id)
        : assembly.joints.find((joint) => joint.type === "axis" && jointSelected(joint));

    return (
        <svg ref={svgRef} width={1500} height={860} className="mechanism-editor"
             style={{position: "absolute", top: 0, left: 0, pointerEvents: editable ? "auto" : "none",
                 cursor: tool ? "copy" : undefined}}
             onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
            {editable && <rect width={1500} height={860} fill={"transparent"} onPointerDown={() => onSelect(null)}/>}
            {assembly.joints.filter((joint) => joint.type === "axis").map((joint) => (
                <AxisMark key={joint.id} axis={joint}/>
            ))}
            {editable && !tool && selectedAxis && <AxisLine axis={selectedAxis}
                onMove={(event) => begin(event, {kind: "axis", axis: selectedAxis})}/>}
            {sorted.filter((part) => part.type !== "wheel" && part.type !== "valve").map((part) => (
                <g key={part.id} onPointerDown={(event) => pressPart(event, part)} style={{cursor: editable ? "grab" : undefined}}>
                    <PartShape part={part} pose={state.poses[part.id]} outline={outline(part.id)}/>
                </g>
            ))}
            {sorted.filter(isWheel).map((part) => (
                <g key={part.id} onPointerDown={(event) => pressPart(event, part)}
                   style={{cursor: editable ? (tool ? "copy" : "grab") : undefined}}>
                    <PartShape part={part} pose={state.poses[part.id]} outline={outline(part.id)}/>
                </g>
            ))}
            {/*Belts in front of all parts; with a tool on, clicks go through them to the wheels*/}
            {assembly.joints.filter((joint) => joint.type === "belt").map((joint) => (
                <g key={joint.id} onPointerDown={(event) => selectJoint(event, joint)}
                   style={{cursor: editable ? "pointer" : undefined, pointerEvents: tool ? "none" : undefined}}>
                    <Belt joint={joint} parts={parts} poses={state.poses} selected={jointSelected(joint)}/>
                </g>
            ))}
            {assembly.joints.map((joint) => {
                const mark = jointSelected(joint) ? selectColor : colors.metal;
                if (joint.type === "ground") {
                    const [x, y] = toPx(joint.at);
                    return <g key={joint.id} onPointerDown={(event) => selectJoint(event, joint)}>
                        <GroundSymbol x={x} y={y}/>
                        {jointSelected(joint) && <circle cx={x} cy={y + 10} r={14} fill={"none"} stroke={selectColor} strokeWidth={2}/>}
                    </g>;
                }
                if (joint.type === "pin" || joint.type === "weld") {
                    const [x, y] = toPx(partPoint(parts[joint.a.part], state.poses[joint.a.part], joint.a.point));
                    return <g key={joint.id} onPointerDown={(event) => selectJoint(event, joint)} style={{cursor: "pointer"}}>
                        {joint.type === "pin"
                            ? <circle cx={x} cy={y} r={5} fill={"white"} stroke={mark} strokeWidth={2.5}/>
                            : <rect x={x - 5} y={y - 5} width={10} height={10} fill={mark}/>}
                    </g>;
                }
                if (joint.type === "contact") {
                    const [x, y] = toPx(contactPoint(joint, parts, state.poses));
                    return <circle key={joint.id} cx={x} cy={y} r={jointSelected(joint) ? 6 : 4} fill={"#f08c00"}
                                   stroke={jointSelected(joint) ? selectColor : "white"} strokeWidth={1.5}
                                   onPointerDown={(event) => selectJoint(event, joint)} style={{cursor: "pointer"}}/>;
                }
                return null;
            })}
            {snap && [snap.wheel, snap.other].map((id) => <Surfaces key={id} part={parts[id]} pose={state.poses[id]}/>)}
            {snap && (() => {
                const [x, y] = toPx([state.poses[snap.wheel].x, state.poses[snap.wheel].y]);
                const r = parts[snap.wheel].radius * k;
                return <g pointerEvents={"none"}>
                    <rect x={x - 75} y={y - r - 38} width={150} height={28} rx={14} fill={surfaceColor}/>
                    <text x={x} y={y - r - 18} textAnchor={"middle"} fontSize={16} fontWeight={600} fill={"white"}>Spusti za stik</text>
                </g>;
            })()}
            {tool?.type === "belt" && assembly.parts.filter(isWheel).map((part) => (
                <Surfaces key={part.id} part={part} pose={state.poses[part.id]} first={tool.first === part.id}/>
            ))}

            {editable && !tool && assembly.parts.map((part) => partPoints(part).map((point) => {
                const [x, y] = toPx(partPoint(part, state.poses[part.id], point.id));
                const target = link?.target?.part === part.id && link.target.point === point.id;
                return <circle key={part.id + point.id} className="mechanism-point" cx={x} cy={y} r={target ? 7 : 4}
                               fill={target ? selectColor : "white"} stroke={"#495057"} strokeWidth={1.5}
                               onPointerDown={(event) => begin(event, {kind: "point", part: part.id, point: point.id})}/>;
            }))}
            {editable && !tool && selectedAxis && <AxisHandle axis={selectedAxis} bar={parts[selectedAxis.bar]}
                pose={state.poses[selectedAxis.bar]}
                onTurn={(event, flip) => begin(event, {kind: "axis", axis: selectedAxis, turn: true, flip})}/>}
            {link && (() => {
                const [x1, y1] = toPx(link.from), [x2, y2] = toPx(link.to);
                return <g pointerEvents={"none"}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={selectColor} strokeWidth={2} strokeDasharray={"5 4"}/>
                </g>;
            })()}
            {placing?.at && placing.type === "bearing" && (
                <g pointerEvents={"none"} opacity={0.75}><GroundSymbol x={placing.at[0]} y={placing.at[1]}/></g>
            )}
            {placing?.at && placing.type !== "bearing" && (
                <g pointerEvents={"none"} opacity={0.75}>
                    <circle cx={placing.at[0]} cy={placing.at[1]} r={10} fill={"none"} stroke={selectColor} strokeWidth={2}/>
                    <line x1={placing.at[0] - 14} y1={placing.at[1]} x2={placing.at[0] + 14} y2={placing.at[1]} stroke={selectColor}/>
                    <line x1={placing.at[0]} y1={placing.at[1] - 14} x2={placing.at[0]} y2={placing.at[1] + 14} stroke={selectColor}/>
                </g>
            )}
        </svg>
    );
};

export default MechanismEditor;
