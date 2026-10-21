import {Button} from "react-bootstrap";
import config from "../config";
import {ERROR, OK, WARNING} from "../simulation/model";
import {isFinished, modelTime, RUN, supplyRatio} from "../simulation/reducer";
import {meanLevel, steadyState, targetReachedAt, timeConstant} from "../simulation/measurements";
import {meanDemand} from "../simulation/schedule";
import {consumerFlow} from "../simulation/model";
import Operate from "./Operate";

const supplyColors = {[OK]: "#3aa73f", [WARNING]: "#f0ad4e", [ERROR]: "#dc3545"};

const Item = ({label, children}) => (
    <div className={"d-flex flex-column"} style={{paddingLeft: "24px"}}>
        <small style={{color: "#6c757d"}}>{label}</small>
        <b>{children}</b>
    </div>
);

//Run control and run summary, stays at the top of the page while scrolling
//Fill / drain time to the target and the steady state, measured from the level history
const PlantMeasurements = ({model, target}) => {
    const reached = targetReachedAt(model.history.level, target);
    const steady = steadyState(model.history.level);
    return (
        <>
            <Item label={`Time to ${target.toFixed(2)} m`}>{reached === null ? "–" : `${reached.toFixed(1)} s`}</Item>
            <Item label={"Steady state"}>
                {steady === null ? "–" : `${steady.level.toFixed(3)} m from ${steady.time.toFixed(1)} s`}
            </Item>
        </>
    );
};

const verdictStyle = (passed) => ({
    marginLeft: "10px",
    padding: "0 8px",
    borderRadius: "3px",
    color: "white",
    backgroundColor: passed ? "#3aa73f" : "#dc3545",
});

//Mean demand at the reference, mean level and IAE against the pass limits
const LoadMeasurements = ({model, finished}) => {
    const {duration, pass} = config.evaluation[model.mode];
    const totalSteps = Math.round(duration / config.simulation.step);
    const demand = meanDemand(model.schedule, totalSteps, model.referenceLevel,
        (i, level) => consumerFlow(level, config.consumers.list[i].diameterMm));
    const mean = meanLevel(model.history.level);
    const meanOk = Math.abs(mean - model.referenceLevel) <= pass.meanTolerance;
    const iaeLimit = pass.iaeLimit[model.referenceLevel];
    const iaeOk = model.iae <= iaeLimit;
    const color = (ok) => ({color: ok ? "#3aa73f" : "#dc3545"});
    return (
        <>
            <Item label={"Mean demand at reference"}>{demand.toFixed(6)} m³/s</Item>
            <Item label={`Mean level (goal ±${pass.meanTolerance * 100} cm)`}>
                <span style={color(meanOk)}>{mean.toFixed(3)} m</span>
            </Item>
            <Item label={`IAE (goal ≤ ${iaeLimit})`}>
                <span style={color(iaeOk)}>{model.iae.toFixed(2)} m·s</span>
                {finished && <span style={verdictStyle(meanOk && iaeOk)}>{meanOk && iaeOk ? "PASSED" : "FAILED"}</span>}
            </Item>
        </>
    );
};

//Steady level and time constant of the mechanical controller's step response
const TuningMeasurements = ({model}) => {
    const steady = steadyState(model.history.level);
    const response = timeConstant(model.history.level);
    return (
        <>
            <Item label={"Steady state"}>
                {steady === null ? "–" : `${steady.level.toFixed(3)} m from ${steady.time.toFixed(1)} s`}
            </Item>
            <Item label={"Time constant (63 %)"}>{response === null ? "–" : `${response.t63.toFixed(1)} s`}</Item>
        </>
    );
};

//counting: run countdown in progress, shown as running
const ControlBar = ({model, flows, setStatus, setInput, counting = false}) => {
    const {
        duration, referenceLabel = "Reference", showReference = true, metric, lockConsumers = false,
        supplyTarget, consumers = true, startLevels, references,
    } = config.evaluation[model.mode];
    const {referenceLevel} = model;
    const time = modelTime(model);
    const finished = isFinished(model);
    const enabled = model.consumersEnabled;
    const anyEnabled = enabled.some(Boolean);
    const setEnabled = (value) => !lockConsumers && setInput("consumersEnabled", value);
    const supply = supplyRatio(model);
    const passed = supply !== null && supply >= supplyTarget;

    return (
        <div className={"d-flex align-items-center"} style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            flexWrap: "wrap",
            rowGap: "4px",
            padding: "8px 16px",
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #dee2e6",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
        }}>
            <Operate status={counting ? RUN : model.status} onChange={setStatus} finished={finished}/>

            <Item label={finished ? "Finished" : "Time"}>
                <div className={"d-flex align-items-center"}>
                    <div style={{width: "200px", height: "10px", backgroundColor: "#dee2e6", borderRadius: "5px"}}>
                        <div style={{
                            width: `${Math.min(time / duration, 1) * 100}%`,
                            height: "100%",
                            backgroundColor: "#343a40",
                            borderRadius: "5px",
                        }}/>
                    </div>
                    <span style={{paddingLeft: "10px", width: "110px"}}>{time.toFixed(1)} / {duration} s</span>
                </div>
            </Item>

            {references && (
                <Item label={"Reference"}>
                    <select value={referenceLevel} disabled={model.step > 0}
                            title={model.step > 0 ? "Reset to change the reference" : undefined}
                            onChange={(event) => setInput("referenceLevel", parseFloat(event.target.value))}>
                        {references.map((level) => <option key={level} value={level}>{level.toFixed(2)} m</option>)}
                    </select>
                </Item>
            )}

            {startLevels && (
                <Item label={"Start level"}>
                    <select value={model.initialLevel} disabled={model.step > 0}
                            title={model.step > 0 ? "Reset to change the start level" : undefined}
                            onChange={(event) => setInput("initialLevel", parseFloat(event.target.value))}>
                        {startLevels.map((level) => <option key={level} value={level}>{level.toFixed(2)} m</option>)}
                    </select>
                </Item>
            )}

            {showReference ? (
                <Item label={`Level / ${referenceLabel.toLowerCase()}`}>
                    {model.level.toFixed(3)} / <span style={{color: "#fd8000"}}>{referenceLevel.toFixed(3)}</span> m
                </Item>
            ) : <Item label={"Level"}>{model.level.toFixed(3)} m</Item>}

            {(metric === "iae" || metric === "supply") && <Item label={"IAE"}>{model.iae.toFixed(2)} m·s</Item>}

            {(metric === "load" || metric === "pi") && <LoadMeasurements model={model} finished={finished}/>}

            {metric === "tuning" && <TuningMeasurements model={model}/>}

            {metric === "plant" && <PlantMeasurements model={model} target={referenceLevel}/>}

            {supplyTarget !== undefined && (
                <Item label={`Consumers in green or orange (goal ≥ ${supplyTarget * 100} %)`}>
                    <span style={{color: supply === null ? undefined : passed ? "#3aa73f" : "#dc3545"}}>
                        {supply === null ? "–" : `${(supply * 100).toFixed(1)} %`}
                    </span>
                    {finished && (
                        <span style={{
                            marginLeft: "10px",
                            padding: "0 8px",
                            borderRadius: "3px",
                            color: "white",
                            backgroundColor: passed ? "#3aa73f" : "#dc3545",
                        }}>{passed ? "PASSED" : "FAILED"}</span>
                    )}
                </Item>
            )}

            {consumers && <Item label={lockConsumers ? "Consumers" : "Consumers (click to enable / disable)"}>
                <div className={"d-flex align-items-center"}>
                    {!lockConsumers && <Button size={"sm"} variant={anyEnabled ? "dark" : "outline-dark"}
                            style={{marginRight: "8px", padding: "0 8px"}}
                            onClick={() => setEnabled(enabled.map(() => !anyEnabled))}>
                        {anyEnabled ? "All on" : "All off"}
                    </Button>}
                    {config.consumers.list.map((consumer, i) => (
                        <button key={consumer.name} type={"button"}
                                title={lockConsumers ? flows.supply[i] ?? "off"
                                    : enabled[i] ? `${flows.supply[i] ?? "off"}, click to disable` : "disabled, click to enable"}
                                onClick={() => setEnabled(enabled.map((value, j) => (j === i ? !value : value)))}
                                style={{
                                    marginRight: "4px",
                                    padding: "0 6px",
                                    borderRadius: "3px",
                                    fontWeight: "bold",
                                    cursor: lockConsumers ? "default" : "pointer",
                                    ...(enabled[i]
                                        ? {
                                            color: "white",
                                            border: "1px solid transparent",
                                            backgroundColor: supplyColors[flows.supply[i]] ?? "#AEB6BF",
                                        }
                                        : {
                                            color: "#AEB6BF",
                                            border: "1px dashed #AEB6BF",
                                            backgroundColor: "white",
                                            textDecoration: "line-through",
                                        }),
                                }}>{consumer.name}</button>
                    ))}
                </div>
            </Item>}
        </div>
    );
};

export default ControlBar;
