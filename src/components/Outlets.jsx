import config from "../config";
import {consumerOpening, ERROR, OK, WARNING} from "../simulation/model";
import colors from "./pipeColors";
import BallValve from "./BallValve";


const {pipeTopPx, pipeBottomPx, valveYPx} = config.outlets;
const streamLengthPx = 30;

const Pipe = ({x, width}) => (
    <g>
        <rect x={x - width / 2} y={pipeTopPx} width={width} height={pipeBottomPx - pipeTopPx} fill={colors.pipe}/>
        <rect x={x + width / 2 - width * 0.28} y={pipeTopPx} width={width * 0.28} height={pipeBottomPx - pipeTopPx}
              fill={colors.pipeDark}/>
        <rect x={x - width / 2 - 3} y={pipeBottomPx - 6} width={width + 6} height={6} rx={2} fill={colors.pipeDark}/>
    </g>
);

const Stream = ({x, width}) => width > 0 && (
    <div className={"water-stream"} style={{
        position: "absolute",
        top: pipeBottomPx,
        left: x - width / 2,
        width,
        height: streamLengthPx,
    }}/>
);

//Label colours by supply status; off consumers stay neutral
const supplyStyles = {
    [OK]: {backgroundColor: "#d4edda", borderColor: "#3aa73f"},
    [WARNING]: {backgroundColor: "#fff3cd", borderColor: "#f0ad4e"},
    [ERROR]: {backgroundColor: "#f8d7da", borderColor: "#dc3545"},
    off: {backgroundColor: "#D7DBDD", borderColor: "#AEB6BF"},
};

const idle = config.consumers.idleFlowRatio > 0;

const ConsumerLabel = ({x, name, diameterMm, enabled, on, flow, nominal, supply}) => (
    <div style={{
        position: "absolute",
        top: pipeBottomPx + streamLengthPx + 8,
        left: x - 64,
        width: 128,
        padding: "2px 6px",
        fontSize: "13px",
        borderStyle: "solid",
        borderWidth: "2px",
        borderRadius: "5px",
        ...supplyStyles[supply ?? "off"],
        opacity: enabled ? 1 : 0.5,
    }}>
        <div className={"d-flex justify-content-between align-items-center"}>
            <span><b>{name}</b> Ø{diameterMm} mm</span>
            <span style={{
                padding: "0 5px",
                borderRadius: "3px",
                color: "white",
                fontWeight: "bold",
                backgroundColor: on ? "#343a40" : "#AEB6BF",
            }}>{enabled ? (on ? "ON" : idle ? "LOW" : "OFF") : "✕"}</span>
        </div>
        {enabled ? <div><b>{flow.toFixed(5)}</b> <i>m³/s</i></div> : <div><i>disabled</i></div>}
        <div style={{fontSize: "11px"}}>nominal {nominal.toFixed(5)}</div>
    </div>
);

/**
 * Outlet pipes under the tank: continuous drain valve and on/off consumers.
 * drainPosition [%], drainFlow [m³/s], consumer enabled flags, states, flows and nominal flows [m³/s],
 * supply statuses.
 */
const Outlets = ({
                     showDrain = true, showConsumers = true, drainPosition, drainFlow, drainStemFromPx,
                     enabled, states, flows, nominal, supply,
                 }) => {
    const {drain} = config;
    //A page without consumers draws none
    const consumers = {...config.consumers, list: showConsumers ? config.consumers.list : []};
    const drainOpen = drainPosition / 100;
    return (
        <>
            <svg width={1500} height={pipeBottomPx + streamLengthPx}
                 style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
                {showDrain && (
                    <>
                        {/*Drain valve stem to its slider panel*/}
                        <line x1={drainStemFromPx} y1={valveYPx} x2={drain.xPx} y2={valveYPx} stroke="black" strokeWidth={2}/>
                        <Pipe x={drain.xPx} width={drain.pipeWidthPx}/>
                        <BallValve x={drain.xPx} y={valveYPx} width={drain.pipeWidthPx} open={drainOpen}/>
                    </>
                )}

                {consumers.list.map((consumer, i) => {
                    const width = consumer.diameterMm * consumers.pipePxPerMm;
                    return (
                        <g key={consumer.name}>
                            <Pipe x={consumer.xPx} width={width}/>
                            <BallValve x={consumer.xPx} y={valveYPx} width={width}
                                       open={consumerOpening(states[i], enabled[i])}/>
                        </g>
                    );
                })}
            </svg>
            {showDrain && <Stream x={drain.xPx} width={drainFlow > 0 ? (drain.pipeWidthPx - 8) * drainOpen : 0}/>}
            {consumers.list.map((consumer, i) => (
                <Stream key={consumer.name} x={consumer.xPx}
                        width={flows[i] > 0
                            ? (consumer.diameterMm * consumers.pipePxPerMm - 6) * consumerOpening(states[i], enabled[i])
                            : 0}/>
            ))}
            {consumers.list.map((consumer, i) => (
                <ConsumerLabel key={consumer.name} x={consumer.xPx} name={consumer.name}
                               diameterMm={consumer.diameterMm} enabled={enabled[i]} on={states[i]} flow={flows[i]}
                               nominal={nominal[i]} supply={supply[i]}/>
            ))}
        </>
    );
};

export default Outlets;
