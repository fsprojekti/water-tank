import {useCallback} from "react";
import config from "../config";
import {RUN} from "../simulation/reducer";
import useCountdown from "./useCountdown";
import Scheme from "./Scheme";
import FluidTank from "./FluidTank";
import ControlSlider from "./ControlSlider";
import DisplayVar from "./DisplayVar";
import Outlets from "./Outlets";
import TankVessel from "./TankVessel";
import BallValve from "./BallValve";
import IntakePipe from "./IntakePipe";
import ControlBar from "./ControlBar";
import Chart from "./Chart";

const {valvePanel} = config.render;

//Second line of a valve panel
export const FlowInfo = ({flow}) => (
    <>
        <span>Flow:</span>
        <span>{flow.toFixed(5)} <i>m³/s</i></span>
    </>
);

//Big countdown number over the tank; clicks pass through to the valves
const CountdownOverlay = ({count}) => (
    <div style={{
        position: "absolute",
        top: 300,
        left: 826,
        width: 200,
        height: 200,
        lineHeight: "200px",
        borderRadius: "50%",
        textAlign: "center",
        fontSize: "130px",
        fontWeight: "bold",
        color: "white",
        backgroundColor: "rgba(52, 58, 64, 0.75)",
        pointerEvents: "none",
        zIndex: 10,
    }}>{count}</div>
);

/**
 * Parts shared by all pages: run control bar, tank, intake and drain valves, consumers, displays and chart.
 * The intake valve is set by the student unless intakeAuto (mechanical controller); page specific parts go in children.
 * Run starts after a short countdown, so the student has time to get to the valve.
 */
const TankPlant = ({model, flows, setStatus, setInput, intakeAuto = false, children}) => {
    const {
        duration, referenceLevel, referenceLabel = "Reference", showReference = true, metric,
        drainValve = true, consumers = true,
    } = config.evaluation[model.mode];
    const heightPx = config.tank.height * config.render.m2Px;

    const run = useCallback(() => setStatus(RUN), [setStatus]);
    const countdown = useCountdown(run);
    const changeStatus = (status) => {
        if (status === RUN) {
            if (model.status !== RUN) countdown.start();
            return;
        }
        countdown.cancel();
        setStatus(status);
    };

    return (
        <>
            <ControlBar model={model} flows={flows} setStatus={changeStatus} setInput={setInput}
                        counting={countdown.count !== null}/>

            <div className={"plant-layout"}>
                <Scheme running={model.status === RUN}>
                    <FluidTank flow={flows.inValvePos}
                               heightPx={heightPx}
                               offsetPx={config.tank.offsetPx}
                               level={model.level / config.tank.height * 100}
                               reference={showReference ? referenceLevel / config.tank.height * 100 : undefined}/>
                    <TankVessel/>
                    <svg width={800} height={valvePanel.intakeTopPx}
                         style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
                        <IntakePipe/>
                        {/*Valve stem down to its panel*/}
                        <line x1={config.intake.valveXPx} y1={config.intake.valveYPx}
                              x2={config.intake.valveXPx} y2={valvePanel.intakeTopPx} stroke="black" strokeWidth={2}/>
                        <BallValve x={config.intake.valveXPx} y={config.intake.valveYPx} width={config.intake.pipeWidthPx}
                                   open={flows.inValvePos / 100} horizontal/>
                    </svg>
                    <ControlSlider top={valvePanel.intakeTopPx} left={valvePanel.leftPx} width={valvePanel.widthPx}
                                   value={flows.inValvePos} decimals={intakeAuto ? 1 : 0} disabled={intakeAuto}
                                   info={<FlowInfo flow={flows.flowIn}/>}
                                   onChange={(value) => setInput("inValvePos", value)}/>
                    {children}
                    {showReference && (
                        <DisplayVar top={228} left={990} value={referenceLevel} unit={"m"} name={referenceLabel}
                                    decimal={3} variant={"reference"}/>
                    )}
                    <DisplayVar top={228} left={1200} value={model.level} unit={"m"} name={"Level"} decimal={3}/>

                    <Outlets showDrain={drainValve} showConsumers={consumers} drainPosition={model.outValvePos} drainFlow={flows.drain}
                             drainStemFromPx={valvePanel.leftPx + valvePanel.widthPx} enabled={model.consumersEnabled}
                             states={flows.states} flows={flows.consumers}
                             nominal={flows.nominal} supply={flows.supply}/>
                    {drainValve && (
                        <>
                            <ControlSlider top={config.outlets.valveYPx - 45} left={valvePanel.leftPx}
                                           width={valvePanel.widthPx} value={model.outValvePos}
                                           info={<FlowInfo flow={flows.drain}/>}
                                           onChange={(value) => setInput("outValvePos", value)}/>
                        </>
                    )}
                    {countdown.count !== null && <CountdownOverlay count={countdown.count}/>}
                </Scheme>

                <Chart history={model.history} reference={referenceLevel} duration={duration} showDrain={drainValve}
                       showConsumers={consumers} metric={metric}/>
            </div>
        </>
    );
};

export default TankPlant;
