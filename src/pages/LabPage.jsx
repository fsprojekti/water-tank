import {useEffect} from "react";
import {Button, ButtonGroup, Nav, Navbar} from "react-bootstrap";
import {Link, Navigate, useParams} from "react-router-dom";
import config from "../config";
import {drainScenarios, labSettings, labTasks} from "../labConfig";
import {useTankModel} from "../context/useTankModel";
import {isFinished, modelFlows, RESET, RUN, STOP} from "../simulation/reducer";
import {labMeasurements} from "../simulation/labMeasurements";
import {integralBeltRatio, integralClosingLevel, labControl} from "../simulation/labController";
import {beltRatio} from "../simulation/controller";
import ControlSlider from "../components/ControlSlider";
import TankPlant from "../components/TankPlant";
import RackDrive from "../components/RackDrive";
import LabIntegralDrive from "../components/LabIntegralDrive";
import LabChart from "../components/LabChart";
import "../lab.css";

const format = (value, digits = 3) => value === null || value === undefined ? "—" : value.toFixed(digits);
const Metric = ({label, children}) => <div className="lab-metric"><small>{label}</small><b>{children}</b></div>;
const {valvePanel} = config.render;

//The original plant layout with the five student modes; instructions remain in Moodle.
const LabSession = ({task}) => {
    const {model, setStatus, setInput} = useTankModel(task.mode);
    const evaluation = config.evaluation[task.mode];
    const flows = modelFlows(model);
    const measures = labMeasurements(model);
    const finished = isFinished(model);
    const mechanical = evaluation.controller === "mechanical";
    const integral = evaluation.controller === "integral" || evaluation.controller === "parallelPI";
    const locked = model.step > 0 || model.status === RUN;
    useEffect(() => () => setStatus(STOP), [setStatus]);

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
            {evaluation.research && <>
                <Metric label="Hitrost">
                    <select aria-label="Hitrost simulacije" value={model.speed} onChange={(e) => setInput("speed", Number(e.target.value))}>
                        {[1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}
                    </select>
                </Metric>
                <Metric label="Odtok · odprtje ventila">
                    <select aria-label="Scenarij odtoka" value={model.scenario} disabled={locked || counting}
                            title={locked ? "Za spremembo izberi Nov poskus" : undefined}
                            onChange={(e) => setInput("scenario", e.target.value)}>
                        {drainScenarios.filter((s) => task.grade !== 7 || s.opening !== undefined && s.after === undefined)
                            .map((s) => <option value={s.id} key={s.id}>{s.label}</option>)}
                    </select>
                </Metric>
            </>}
            {evaluation.randomDrain && <Metric label="Odtok">Naključno · 12–36 %</Metric>}
            <Metric label="Nivo / želeni nivo">{model.level.toFixed(3)} / <span style={{color: "#fd8000"}}>{model.referenceLevel.toFixed(2)}</span> m</Metric>
            {task.grade === 6 ? <Metric label="Ustrezna oskrba">{format(measures.supply === null ? null : measures.supply * 100, 1)} %</Metric> : <>
                <Metric label="Ustaljeni nivo">{format(measures.steadyLevel)} m</Metric>
                <Metric label="Povprečni pogrešek · 10 s">{format(measures.enough ? measures.error : null)} m</Metric>
                {mechanical && <Metric label="Čas 63 % odziva">{format(measures.t63, 1)} s</Metric>}
                {integral && <Metric label="Prenihaj">{format(measures.overshoot)} m</Metric>}
                {integral && <Metric label="Razpon nivoja · 10 s">{format(measures.enough ? measures.range : null)} m</Metric>}
                <Metric label="IAE">{model.iae.toFixed(2)} m·s</Metric>
            </>}
            {measures.preError !== null && <Metric label="Pogrešek pred skokom">{measures.preError.toFixed(3)} m</Metric>}
            {integral && labControl(model, evaluation.controller).saturated && <Metric label="Stanje ventila">Na omejitvi</Metric>}
            {task.grade === 10 && <Metric label="Nivo zapiranja h₀">{integralClosingLevel(model).toFixed(3)} m</Metric>}
            {finished && <span className="lab-finished" role="status" aria-label="Rezultat poskusa">Poskus je končan.</span>}
        </div>
        <h1 className="lab-view-title"><b>Ocena {task.grade} · </b>{task.title}</h1>
    </>;

    return <TankPlant model={model} flows={flows} setStatus={setStatus} setInput={setInput} intakeAuto={task.grade !== 6}
                      hideTitle toolbar={renderToolbar} chart={<LabChart model={model}/>}>
        {mechanical && <RackDrive level={model.level} kp={model.kp} h0={model.h0} opening={flows.inValvePos}/>}
        {integral && <LabIntegralDrive model={model}/>}
        {(mechanical || task.grade === 10) && <ControlSlider top={450} left={valvePanel.leftPx} width={valvePanel.widthPx}
            label="Kp" unit="1/m" decimals={1} min={1} max={10} step={0.1} value={model.kp} disabled={locked}
            info={<><span>Jermenski prenos:</span><span>{beltRatio(model.kp).toFixed(2)} : 1</span></>}
            onChange={(value) => setInput("kp", value)}/>}
        {mechanical && <ControlSlider top={540} left={valvePanel.leftPx} width={valvePanel.widthPx}
            label="Nivo zapiranja h₀" unit="m" decimals={2} min={0.1} max={1} step={0.01} value={model.h0} disabled={locked}
            onChange={(value) => setInput("h0", value)}/>}
        {integral && <ControlSlider top={task.grade === 9 ? 450 : 540} left={valvePanel.leftPx} width={valvePanel.widthPx}
            label="Ki" unit="1/(m·s)" decimals={2} min={labSettings.kiLimits[0]} max={labSettings.kiLimits[1]} step={0.05}
            info={<><span>Prenos turbine:</span><span>{integralBeltRatio(model, evaluation.controller).toFixed(3)} : 1</span></>}
            value={model.ki} disabled={locked} onChange={(value) => setInput("ki", value)}/>}
    </TankPlant>;
};

const LabPage = () => {
    const {grade} = useParams();
    const task = labTasks.find((t) => t.grade === Number(grade));
    if (!task) return <Navigate to="/vaja/6" replace/>;
    return <main className="lab-page">
        <Navbar bg="dark" variant="dark" className="lab-navigation">
            <Navbar.Brand as={Link} to="/vaja/6" style={{paddingLeft: "10px"}}>MKTP Laboratory</Navbar.Brand>
            <Nav className="mr-auto" as="nav" aria-label="Načini regulacije">
                {labTasks.map((t) => <Nav.Link as={Link} key={t.grade} to={"/vaja/" + t.grade} title={t.title}
                    aria-label={"Ocena " + t.grade + ": " + t.title}
                    active={t.grade === task.grade} aria-current={t.grade === task.grade ? "page" : undefined}>
                    Ocena {t.grade}
                </Nav.Link>)}
            </Nav>
        </Navbar>
        <LabSession key={task.mode} task={task}/>
    </main>;
};

export default LabPage;
