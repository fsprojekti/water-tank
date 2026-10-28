import {useEffect} from "react";
import {Button, ButtonGroup} from "react-bootstrap";
import {Navigate, useParams} from "react-router-dom";
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
import LabNavigation from "../components/LabNavigation";
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
    //Constant drain openings allowed by the task; the drain slider snaps to them
    const drainChoices = evaluation.drains && drainScenarios.filter(({id}) => evaluation.drains.includes(id));
    const drainControl = drainChoices && {
        values: drainChoices.map(({opening}) => opening), disabled: locked,
        onChange: (opening) => setInput("scenario", drainChoices.find((s) => s.opening === opening).id),
    };
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
            {/*Tasks with fixed drain openings set them on the drain valve slider instead.*/}
            {evaluation.research && !drainChoices && <Metric label="Odtok · odprtje ventila">
                <select aria-label="Scenarij odtoka" value={model.scenario} disabled={locked || counting}
                        title={locked ? "Za spremembo izberi Nov poskus" : undefined}
                        onChange={(e) => setInput("scenario", e.target.value)}>
                    {drainScenarios.map((s) => <option value={s.id} key={s.id}>{s.label}</option>)}
                </select>
            </Metric>}
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
                      drainControl={drainControl}
                      hideTitle toolbar={renderToolbar} chart={<LabChart model={model}/>}>
        {/*The carriage is fixed at the reference: u = Kp·e, no crank to move it.*/}
        {mechanical && <RackDrive level={model.level} kp={model.kp} h0={model.h0} opening={flows.inValvePos} crank={false}/>}
        {integral && <LabIntegralDrive model={model}/>}
        {/*Controller panels share the gap between the intake and drain panels, so they never overlap.*/}
        <div className="lab-controller-panels" style={{left: valvePanel.leftPx, width: valvePanel.widthPx,
            top: valvePanel.intakeTopPx + valvePanel.heightPx,
            height: config.outlets.valveYPx - 45 - valvePanel.intakeTopPx - valvePanel.heightPx}}>
            {(mechanical || task.grade === 10) && <ControlSlider width={valvePanel.widthPx}
                label="Kp" unit="1/m" decimals={1} min={1} max={10} step={0.1} value={model.kp} disabled={locked}
                info={<><span>Jermen:</span><span>{beltRatio(model.kp).toFixed(2)} : 1</span></>}
                onChange={(value) => setInput("kp", value)}/>}
            {integral && <ControlSlider width={valvePanel.widthPx}
                label="Ki" unit="1/(m·s)" decimals={2} min={labSettings.kiLimits[0]} max={labSettings.kiLimits[1]} step={0.05}
                info={<><span>Turbina:</span><span>{integralBeltRatio(model, evaluation.controller).toFixed(3)} : 1</span></>}
                value={model.ki} disabled={locked} onChange={(value) => setInput("ki", value)}/>}
        </div>
    </TankPlant>;
};

const LabPage = () => {
    const {grade} = useParams();
    const task = labTasks.find((t) => t.grade === Number(grade));
    if (!task) return <Navigate to="/vaja/6" replace/>;
    return <main className="lab-page">
        <LabNavigation active={task.grade}/>
        <LabSession key={task.mode} task={task}/>
    </main>;
};

export default LabPage;
