import {useEffect, useMemo, useRef, useState} from "react";
import {Button, ButtonGroup} from "react-bootstrap";
import config from "../config";
import {buildTask, drainScenarios} from "../labConfig";
import {useTankModel} from "../context/useTankModel";
import {isFinished, modelFlows, RESET, RUN, STOP} from "../simulation/reducer";
import {labMeasurements} from "../simulation/labMeasurements";
import {analyse, fromPx, isWheel} from "../simulation/mechanism";
import {
    addBearing, addBelt, addPart, closeValve, connect, detachPart, emptyBuild, moveWater, exampleBuild, removeBearing, removeJoint,
    removePart, saveBuild, setAxis, updateJoint, updatePart,
} from "../simulation/assembly";
import ControlSlider from "../components/ControlSlider";
import TankPlant from "../components/TankPlant";
import LabChart from "../components/LabChart";
import LabNavigation from "../components/LabNavigation";
import MechanismEditor from "../components/MechanismEditor";
import schemePoint from "../components/schemePoint";
import MechanismPanel from "../components/MechanismPanel";
import "../lab.css";

const format = (value, digits = 3) => value === null || value === undefined ? "—" : value.toFixed(digits);
const Metric = ({label, children}) => <div className="lab-metric"><small>{label}</small><b>{children}</b></div>;
const {valvePanel, m2Px} = config.render;
//Where a part appears when its palette card is only clicked [m]: above the tank, a little apart each time
const dropSpot = (count) => [2.5 + (count % 5) * 0.15, 1.45];
//Changes kept for undo
const historyLength = 50;

/**
 * Workshop: the student builds the level controller from parts over the tank, tries it by moving the water
 * by hand, then runs it against the drain like on the measuring pages. Settings lock during a run.
 */
const BuildSession = () => {
    const {model, setStatus, setInput} = useTankModel(buildTask.mode);
    const evaluation = config.evaluation[buildTask.mode];
    const flows = modelFlows(model);
    const measures = labMeasurements(model);
    const finished = isFinished(model);
    const locked = model.step > 0 || model.status === RUN;
    const build = {assembly: model.assembly, state: model.mechanism};
    const analysis = useMemo(() => analyse(model.assembly, model.mechanismStart), [model.assembly, model.mechanismStart]);
    const [selected, setSelected] = useState(null);
    const [tool, setTool] = useState(null);
    const [placing, setPlacing] = useState(null);
    const [message, setMessage] = useState(null);
    const svgRef = useRef(null);
    const drainChoices = drainScenarios.filter(({id}) => evaluation.drains.includes(id));
    const drainControl = {
        values: drainChoices.map(({opening}) => opening), disabled: locked,
        onChange: (opening) => setInput("scenario", drainChoices.find((s) => s.opening === opening).id),
    };

    //Builds before (past) and after (future) the current one, for undo and redo of mechanism changes
    const [history, setHistory] = useState({past: [], future: []});
    //A change is applied and can be undone, or its reason for failing shown
    const apply = (result, select) => {
        if (result.error) {
            setMessage(result.error);
            return;
        }
        setMessage(null);
        setHistory(({past}) => ({past: [...past.slice(1 - historyLength), build], future: []}));
        setInput("build", result);
        if (select) setSelected(select(result));
    };
    //A build from the history comes back at the water level of now; moving the water is not a change
    const restore = (from) => {
        if (locked || !history[from].length) return;
        const target = history[from].at(from === "past" ? -1 : 0);
        setHistory((h) => ({
            past: from === "past" ? h.past.slice(0, -1) : [...h.past, build],
            future: from === "past" ? [build, ...h.future] : h.future.slice(1),
        }));
        setInput("build", moveWater(target, model.level));
        setSelected(null);
        setMessage(null);
    };
    const undo = () => restore("past");
    const redo = () => restore("future");
    //Latest values for window listeners
    const latest = useRef(null);
    useEffect(() => { latest.current = {build, locked, selected, apply, undo, redo}; });
    useEffect(() => () => setStatus(STOP), [setStatus]);
    useEffect(() => saveBuild({assembly: model.assembly, state: model.mechanismStart}), [model.assembly, model.mechanismStart]);

    //Parts are dragged from the palette onto the scheme; a click drops one above the tank. The window listeners
    //are added right away, so a quick drag can't end before they exist.
    const pick = (event, type) => {
        if (locked) return;
        event.preventDefault();
        setTool(null);
        setPlacing({type, at: null});
        const start = [event.clientX, event.clientY];
        const over = (e) => {
            const svg = svgRef.current;
            const element = document.elementFromPoint(e.clientX, e.clientY);
            return svg && element && svg.contains(element) ? schemePoint(svg, e.clientX, e.clientY) : null;
        };
        const move = (e) => setPlacing((current) => current && {...current, at: over(e)});
        const finish = (e) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", finish);
            window.removeEventListener("pointercancel", finish);
            setPlacing(null);
            if (e.type === "pointercancel") return;
            const at = over(e);
            const clicked = Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 4;
            const current = latest.current.build;
            const spot = at ? fromPx(at) : clicked ? dropSpot(current.assembly.parts.length) : null;
            //A bearing fixes the point it is dropped on; other parts are new
            if (type === "bearing" && at) latest.current.apply(addBearing(current, spot));
            else if (type !== "bearing" && spot) {
                latest.current.apply(addPart(current, type, spot), (result) => ({kind: "part", id: result.assembly.parts.at(-1).id}));
            }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", finish);
        window.addEventListener("pointercancel", finish);
    };

    //A joint removed from its part's list leaves the part selected
    const remove = (item) => {
        apply(item.kind === "part" ? removePart(build, item.id) : removeJoint(build, item.id));
        if (selected?.kind === item.kind && selected.id === item.id) setSelected(null);
    };
    useEffect(() => {
        const key = (event) => {
            if (event.target.closest?.("input, textarea, select")) return;
            //Ctrl+Z undoes, Ctrl+Y or Ctrl+Shift+Z redoes (Cmd on a Mac)
            if ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())) {
                event.preventDefault();
                if (event.key.toLowerCase() === "y" || event.shiftKey) latest.current.redo();
                else latest.current.undo();
                return;
            }
            if (event.key === "Escape") {
                setTool(null);
                setSelected(null);
            }
            const {selected: item, locked: fixed, build: current, apply: change} = latest.current;
            if ((event.key === "Delete" || event.key === "Backspace") && item && !fixed && item.id !== "valve") {
                change(item.kind === "part" ? removePart(current, item.id) : removeJoint(current, item.id));
                setSelected(null);
            }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, []);

    //The belt joins two clicked wheels
    const pickForTool = (id) => {
        const part = model.assembly.parts.find((p) => p.id === id);
        if (!isWheel(part)) {
            setMessage("Jermen poveže dve kolesi ali kolo in ventil.");
            return;
        }
        if (!tool.first) {
            setMessage(null);
            setTool({...tool, first: id});
            return;
        }
        const result = addBelt(build, tool.first, id);
        apply(result, (next) => ({kind: "joint", id: next.assembly.joints.at(-1).id}));
        if (!result.error) setTool(null);
    };

    const renderToolbar = ({changeStatus, counting}) => <>
        <div className="lab-toolbar">
            <ButtonGroup style={{width: "300px"}}>
                <Button variant={model.status === RUN || counting ? "dark" : "outline-dark"} onClick={() => changeStatus(RUN)}
                        disabled={finished || counting || model.status === RUN}>
                    {counting ? "Pripravi se …" : model.step ? "Nadaljuj" : "Začni poskus"}</Button>
                <Button variant={model.status === STOP ? "dark" : "outline-dark"} onClick={() => changeStatus(STOP)}
                        disabled={model.status !== RUN && !counting}>Premor</Button>
                <Button variant={model.status === RESET ? "dark" : "outline-dark"} onClick={() => changeStatus(RESET)}>Nov poskus</Button>
            </ButtonGroup>
            <Metric label={finished ? "Končano" : "Čas"}>
                <div className="lab-time"><progress value={measures.time} max={evaluation.duration}/>
                    <span>{measures.time.toFixed(1)} / {evaluation.duration} s</span></div>
            </Metric>
            <Metric label="Nivo / želeni nivo">{model.level.toFixed(3)} / <span style={{color: "#fd8000"}}>{model.referenceLevel.toFixed(2)}</span> m</Metric>
            <Metric label="Ustaljeni nivo">{format(measures.steadyLevel)} m</Metric>
            <Metric label="Povprečni pogrešek · 10 s">{format(measures.enough ? measures.error : null)} m</Metric>
            <Metric label="Čas 63 % odziva">{format(measures.t63, 1)} s</Metric>
            <Metric label="IAE">{model.iae.toFixed(2)} m·s</Metric>
            {finished && <span className="lab-finished" role="status" aria-label="Rezultat poskusa">Poskus je končan.</span>}
        </div>
        <MechanismPanel build={build} analysis={analysis} selected={selected} locked={locked || counting} tool={tool}
                        message={message} onPick={pick} onSelect={setSelected}
                        onTool={(type) => setTool((current) => (current?.type === type ? null : {type, first: null}))}
                        onUpdatePart={(id, changes) => apply(updatePart(build, id, changes))}
                        onAxis={(id, change) => apply(setAxis(build, id, change))}
                        onBearing={(id, on) => apply(on ? connect(build, {part: id, point: "axle"},
                            {ground: [build.state.poses[id].x, build.state.poses[id].y]}) : removeBearing(build, id))}
                        onRemovePart={(id) => remove({kind: "part", id})}
                        onDetach={(id) => apply(detachPart(build, id))}
                        onUpdateJoint={(id, changes) => apply(updateJoint(build, id, changes))}
                        onRemoveJoint={(id) => remove({kind: "joint", id})}
                        onCloseValve={() => apply(closeValve(build))}
                        onExample={() => apply(exampleBuild(model.level), () => null)}
                        onClear={() => apply(emptyBuild(model.level), () => null)}
                        canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={undo} onRedo={redo}/>
        <h1 className="lab-view-title"><b>Delavnica · </b>{buildTask.title}</h1>
    </>;

    const valve = model.assembly.parts.find((part) => part.id === "valve");
    return <TankPlant model={model} flows={flows} setStatus={setStatus} setInput={setInput} intakeAuto drainControl={drainControl}
                      valvePulley={{radius: valve.radius * m2Px, angle: -model.mechanism.poses.valve.a}}
                      hideTitle toolbar={renderToolbar} chart={<LabChart model={model}/>}>
        <MechanismEditor build={build} analysis={analysis} editable={!locked} selected={selected} onSelect={setSelected}
                         tool={tool} onToolPick={pickForTool} onChange={(result) => apply(result)} placing={placing}
                         svgRef={svgRef}/>
        {/*Water moved by hand to try the mechanism before a run; the run starts from here*/}
        <div className="lab-controller-panels" style={{left: valvePanel.leftPx, width: valvePanel.widthPx,
            top: valvePanel.intakeTopPx + valvePanel.heightPx,
            height: config.outlets.valveYPx - 45 - valvePanel.intakeTopPx - valvePanel.heightPx}}>
            <ControlSlider width={valvePanel.widthPx} label="Nivo vode" unit="m" decimals={2} min={0} max={1} step={0.01}
                           value={model.level} disabled={locked}
                           info={<><span>Preizkus z roko</span><span/></>}
                           onChange={(value) => setInput("initialLevel", value)}/>
        </div>
    </TankPlant>;
};

const BuildPage = () => <main className="lab-page">
    <LabNavigation active="build"/>
    <BuildSession/>
</main>;

export default BuildPage;
