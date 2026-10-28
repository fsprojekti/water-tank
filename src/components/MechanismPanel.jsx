import {useState} from "react";
import {Button} from "react-bootstrap";
import colors from "./pipeColors";
import {GroundSymbol} from "./MechanismEditor";
import {partJoints, partTypes, pointLabel} from "../simulation/mechanism";

//Palette entries: parts dragged onto the scheme
const palette = [
    {type: "float", label: "Plovec", hint: "Plava na gladini",
        icon: <rect x={3} y={16} width={34} height={12} rx={3} fill={"rgb(213, 68, 54)"}/>},
    {type: "bar", label: "Letev", hint: "Toga gladka letev, drsi vzdolž svoje osi gibanja",
        icon: <rect x={17} y={2} width={6} height={36} rx={2} fill={colors.steel} stroke={colors.metal}/>},
    {type: "wheel", label: "Kolo", hint: "Torno kolo ali jermenica",
        icon: <g><circle cx={20} cy={20} r={15} fill={colors.steel} stroke={colors.belt} strokeWidth={3}/>
            <circle cx={20} cy={20} r={3} fill={colors.metal}/></g>},
    {type: "bearing", label: "Ležaj", hint: "Spusti na os kolesa ali točko: pritrdi jo na fiksno mesto",
        icon: <g transform="translate(20 8) scale(0.85)"><GroundSymbol x={0} y={0}/></g>},
];

//Tools that join two clicked parts
const tools = [
    {type: "belt", label: "Jermen", hint: "Poveži dve kolesi z jermenom",
        icon: <g><circle cx={10} cy={20} r={7} fill={colors.steel}/><circle cx={30} cy={20} r={7} fill={colors.steel}/>
            <line x1={10} y1={13} x2={30} y2={13} stroke={colors.belt} strokeWidth={3}/>
            <line x1={10} y1={27} x2={30} y2={27} stroke={colors.belt} strokeWidth={3}/></g>},
];

const toolHints = {
    belt: ["Klikni prvo kolo ali ventil · Esc prekliče", "Klikni drugo kolo ali ventil · Esc prekliče"],
};

const cm = (m) => Math.round(m * 1000) / 10;
const degrees = (a) => {
    const d = Math.round(a * 1800 / Math.PI) / 10;
    return ((d + 540) % 360) - 180 || 0;
};

//Number input that only passes on valid values in range, so typing "1" on the way to "12" is harmless
const NumberField = ({label, unit, value, min, max, step = 1, disabled, onChange}) => {
    const [text, setText] = useState(null);
    return (
        <label className="build-field">
            <span>{label}</span>
            <input type="number" value={text ?? String(value)} min={min} max={max} step={step} disabled={disabled}
                   onFocus={() => setText(String(value))} onBlur={() => setText(null)}
                   onChange={(event) => {
                       setText(event.target.value);
                       const number = parseFloat(event.target.value);
                       if (Number.isFinite(number) && number >= min && number <= max) onChange(number);
                   }}/>
            <span>{unit}</span>
        </label>
    );
};

const jointName = {pin: "Zglob", weld: "Tog spoj", ground: "Pritrditev na ogrodje", axis: "Os gibanja", contact: "Torni stik",
    belt: "Jermen"};

//Short description of a joint for lists: "Zglob · Letev 1 (40 cm) – Plovec 1 (sredina)"
const describeJoint = (joint, parts) => {
    const end = ({part, point}) => `${parts[part].name} (${pointLabel(parts[part], point)})`;
    const shaft = joint.type === "weld" && parts[joint.a.part].type !== "bar" && parts[joint.b.part]?.type !== "bar" &&
        parts[joint.a.part].type !== "float" && parts[joint.b.part]?.type !== "float";
    switch (joint.type) {
        case "pin":
        case "weld":
            return `${shaft ? "Ista gred" : jointName[joint.type]} · ${end(joint.a)} – ${end(joint.b)}`;
        case "ground":
            return `${jointName.ground} · ${end(joint.a)}`;
        case "axis":
            return `${jointName.axis} · ${parts[joint.bar].name} (${degrees(joint.angle)}°)`;
        case "belt":
            return `${joint.crossed ? "Prekrižan" : "Odprt"} jermen · ${parts[joint.a].name} – ${parts[joint.b].name}`;
        default:
            return `${jointName[joint.type]} · ${parts[joint.a].name} – ${parts[joint.b].name}`;
    }
};

const Choice = ({options, value, disabled, onChange}) => (
    <div className="btn-group btn-group-sm">
        {options.map(([key, label]) => <Button key={key} size="sm" variant={value === key ? "dark" : "outline-dark"}
                                               disabled={disabled} onClick={() => onChange(key)}>{label}</Button>)}
    </div>
);

//The axis is the bar's own line: its angle turns the bar about the sleeve
const AxisAngle = ({axis, disabled, onAxis}) => <NumberField label="Kot" unit="°" value={degrees(axis.angle)} min={-180}
    max={180} step={5} disabled={disabled} onChange={(v) => onAxis({angle: v * Math.PI / 180})}/>;

const PartProperties = ({part, pose, assembly, disabled, onUpdate, onAxis, onBearing, onRemove, onRemoveJoint, onDetach,
                            onSelect}) => {
    const joints = partJoints(assembly, part.id).filter((joint) => joint.type !== "axis");
    const parts = Object.fromEntries(assembly.parts.map((p) => [p.id, p]));
    const limits = (key) => partTypes[part.type].params[key].slice(1).map(cm);
    const axis = assembly.joints.find((j) => j.type === "axis" && j.bar === part.id);
    return <>
        <b>{part.name}</b>
        {part.type === "float" && <NumberField label="Širina" unit="cm" value={cm(part.width)} min={limits("width")[0]}
            max={limits("width")[1]} disabled={disabled} onChange={(v) => onUpdate({width: v / 100})}/>}
        {part.type === "bar" && <NumberField label="Dolžina" unit="cm" value={cm(part.length)} min={limits("length")[0]}
            max={limits("length")[1]} disabled={disabled} onChange={(v) => onUpdate({length: v / 100})}/>}
        {(part.type === "wheel" || part.type === "valve") && <NumberField label={part.type === "valve" ? "Polmer jermenice" : "Polmer"}
            unit="cm" value={cm(part.radius)} min={limits("radius")[0]} max={limits("radius")[1]} step={0.5}
            disabled={disabled} onChange={(v) => onUpdate({radius: v / 100})}/>}
        {part.type === "bar" && <NumberField label="Kot" unit="°" value={degrees(pose.a)}
            min={-180} max={180} step={5} disabled={disabled} onChange={(v) => onUpdate({angle: v * Math.PI / 180})}/>}
        {part.type === "bar" && <label className="build-field"
            title="Letev drsi samo vzdolž črtkane premice; na shemi premakni premico ali zasukaj letev z ročico">
            <input type="checkbox" checked={Boolean(axis)} disabled={disabled} onChange={(event) => onAxis(event.target.checked || null)}/>
            <span>Os gibanja</span>
        </label>}
        {part.type === "wheel" && <label className="build-field" title="Središče kolesa je pritrjeno na fiksno mesto">
            <input type="checkbox" disabled={disabled} onChange={(event) => onBearing(event.target.checked)}
                   checked={assembly.joints.some((j) => j.type === "ground" && j.a.part === part.id)}/>
            <span>Os v ležaju</span>
        </label>}
        {part.type === "valve" && <small>Odpira se z zasukom v nasprotni smeri urinega kazalca (↺), za 90°.</small>}
        {joints.map((joint) => (
            <span key={joint.id} className="build-joint">
                <button type="button" onClick={() => onSelect({kind: "joint", id: joint.id})}>{describeJoint(joint, parts)}</button>
                <button type="button" className="build-joint-remove" disabled={disabled} title="Odstrani ta spoj"
                        aria-label={`Odstrani: ${describeJoint(joint, parts)}`} onClick={() => onRemoveJoint(joint.id)}>✕</button>
            </span>
        ))}
        {joints.length > 1 && <Button size="sm" variant="outline-secondary" disabled={disabled} onClick={onDetach}
                                      title="Odstrani vse spoje tega dela">Odklopi vse</Button>}
        {part.type !== "valve" && <Button size="sm" variant="outline-danger" disabled={disabled} onClick={onRemove}>Odstrani del</Button>}
    </>;
};

const JointProperties = ({joint, assembly, disabled, onUpdate, onAxis, onRemove}) => {
    const parts = Object.fromEntries(assembly.parts.map((p) => [p.id, p]));
    return <>
        <b>{describeJoint(joint, parts)}</b>
        {(joint.type === "pin" || joint.type === "weld") && <Choice value={joint.type} disabled={disabled}
            options={[["pin", "Zglob (vrtljivo)"], ["weld", "Tog spoj"]]} onChange={(type) => onUpdate({type})}/>}
        {joint.type === "belt" && <Choice value={joint.crossed ? "crossed" : "open"} disabled={disabled}
            options={[["open", "Odprt"], ["crossed", "Prekrižan"]]} onChange={(v) => onUpdate({crossed: v === "crossed"})}/>}
        {joint.type === "contact" && <small>Kolo se brez zdrsa kotali po {parts[joint.b].type === "bar" ? "letvi" : "drugem kolesu"}.</small>}
        {joint.type === "axis" && <AxisAngle axis={joint} disabled={disabled} onAxis={onAxis}/>}
        <Button size="sm" variant="outline-danger" disabled={disabled} onClick={onRemove}>Odstrani spoj</Button>
    </>;
};

/**
 * Builder controls above the scheme: the palette of parts (drag onto the scheme or click), the selected part
 * or joint with its parameters, and what the mechanism does: valve opening, Kp, closing level and problems.
 */
const MechanismPanel = ({build, analysis, selected, locked, tool, message, onPick, onTool, onSelect,
                            onUpdatePart, onAxis, onBearing, onDetach, onRemovePart, onUpdateJoint, onRemoveJoint, onCloseValve, onExample, onClear,
                            canUndo, canRedo, onUndo, onRedo}) => {
    const {assembly, state} = build;
    const part = selected?.kind === "part" && assembly.parts.find((p) => p.id === selected.id);
    const joint = selected?.kind === "joint" && assembly.joints.find((j) => j.id === selected.id);
    const hint = tool ? toolHints[tool.type][tool.first ? 1 : 0]
        : "Povleci del na shemo. Kolo povleci ob letev ali kolo in spusti za stik. Točko ○ povleci na drugo točko (zglob); " +
        "Ležaj spusti na os kolesa. " +
        "Izbrani letvi premakneš os (črtkana premica) ali jo zasukaš z ročico.";
    return (
        <div className="build-panel">
            <div className="build-palette" aria-label="Deli">
                {palette.map(({type, label, hint: title, icon}) => (
                    <button key={type} type="button" className="build-card" title={title} disabled={locked}
                            onPointerDown={(event) => onPick(event, type)}>
                        <svg width={40} height={40} aria-hidden="true">{icon}</svg>
                        <span>{label}</span>
                    </button>
                ))}
                {tools.map(({type, label, hint: title, icon}) => (
                    <button key={type} type="button" className={`build-card${tool?.type === type ? " active" : ""}`}
                            disabled={locked} title={title} onClick={() => onTool(type)}>
                        <svg width={40} height={40} aria-hidden="true">{icon}</svg>
                        <span>{label}</span>
                    </button>
                ))}
            </div>
            <div className="build-properties">
                {part ? <PartProperties part={part} pose={state.poses[part.id]} assembly={assembly} disabled={locked}
                                        onUpdate={(changes) => onUpdatePart(part.id, changes)}
                                        onAxis={(change) => onAxis(part.id, change)}
                                        onBearing={(on) => onBearing(part.id, on)}
                                        onRemoveJoint={onRemoveJoint} onDetach={() => onDetach(part.id)}
                                        onRemove={() => onRemovePart(part.id)} onSelect={onSelect}/>
                    : joint ? <JointProperties joint={joint} assembly={assembly} disabled={locked}
                                               onUpdate={(changes) => onUpdateJoint(joint.id, changes)}
                                               onAxis={(change) => onAxis(joint.bar, change)}
                                               onRemove={() => onRemoveJoint(joint.id)}/>
                        : <small className="build-hint">{locked ? "Za spreminjanje mehanizma izberi Nov poskus." : hint}</small>}
                {message && <small className="build-message" role="alert">{message}</small>}
            </div>
            <div className="build-check" aria-label="Delovanje mehanizma">
                <div className="build-values">
                    <span>Ventil <b>{(state.opening * 100).toFixed(0)} %</b></span>
                    <span>Kp <b>{analysis.kp > 0 ? analysis.kp.toFixed(2) : "—"}</b> 1/m</span>
                    <span>Zapre pri <b>{analysis.h0 === null ? "—" : analysis.h0.toFixed(3)}</b> m</span>
                </div>
                {analysis.issues.length
                    ? <ul className="build-issues">{analysis.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                    : <small className="build-ok">Mehanizem deluje kot P-regulator.</small>}
                <div className="build-actions">
                    <Button size="sm" variant="outline-secondary" disabled={locked || !canUndo} onClick={onUndo}
                            title="Razveljavi zadnjo spremembo (Ctrl+Z)" aria-label="Razveljavi">↶</Button>
                    <Button size="sm" variant="outline-secondary" disabled={locked || !canRedo} onClick={onRedo}
                            title="Ponovi razveljavljeno spremembo (Ctrl+Y)" aria-label="Ponovi">↷</Button>
                    <Button size="sm" variant="outline-dark" disabled={locked} onClick={onCloseValve}
                            title="Zapre ventil in zategne jermenico: ventil se bo zaprl pri tem nivoju">Zapri ventil pri tem nivoju</Button>
                    <Button size="sm" variant="outline-secondary" disabled={locked} onClick={onExample}>Primer</Button>
                    <Button size="sm" variant="outline-secondary" disabled={locked} onClick={onClear}>Počisti</Button>
                </div>
            </div>
        </div>
    );
};

export default MechanismPanel;
