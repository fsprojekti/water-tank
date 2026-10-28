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

//Page title under the run bar, e.g. "Grade 6 · Manual operator"
const PageTitle = ({mode}) => {
    const {grade, title} = config.evaluation[mode];
    return (
        <div style={{textAlign: "center", paddingTop: "6px", color: "#495057", fontSize: "18px"}}>
            {grade && <b>Grade {grade} · </b>}{title}
        </div>
    );
};

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

//Allowed value closest to a slider position
const nearest = (values, value) => values.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best));

/**
 * Parts shared by all pages: run control bar, tank, intake and drain valves, consumers, displays and chart.
 * The intake valve is set by the student unless intakeAuto (mechanical controller); page specific parts go in children.
 * drainControl {values, disabled, onChange} lets a lab task set the drain to the allowed openings only.
 * valvePulley {radius [Px], angle [rad]} replaces the fixed controller pulley on the intake valve.
 * Run starts after a short countdown, so the student has time to get to the valve.
 */
const TankPlant = ({model, flows, setStatus, setInput, intakeAuto = false, drainControl, valvePulley, children, toolbar,
                       chart, hideTitle = false}) => {
    const {
        duration, referenceLabel = "Reference", showReference = true, metric, drainValve = true, consumers = true, lab,
    } = config.evaluation[model.mode];
    const {referenceLevel} = model;
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
            {toolbar ? toolbar({changeStatus, counting: countdown.count !== null}) :
                <ControlBar model={model} flows={flows} setStatus={changeStatus} setInput={setInput}
                            counting={countdown.count !== null}/>}

            {!hideTitle && <PageTitle mode={model.mode}/>}

            <div className={"plant-layout"}>
                <Scheme running={model.status === RUN}>
                    <FluidTank flow={flows.inValvePos}
                               heightPx={heightPx}
                               offsetPx={config.tank.offsetPx}
                               level={model.level / config.tank.height * 100}
                               reference={showReference ? referenceLevel / config.tank.height * 100 : undefined}/>
                    <TankVessel/>
                    {/*Pipe behind the drive; valve and handle stay in front of it.*/}
                    <svg width={800} height={valvePanel.intakeTopPx}
                         style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
                        <IntakePipe/>
                    </svg>
                    {children}
                    <svg width={800} height={valvePanel.intakeTopPx}
                         style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
                        {/*Valve stem down to its panel*/}
                        <line x1={config.intake.valveXPx} y1={config.intake.valveYPx}
                              x2={config.intake.valveXPx} y2={valvePanel.intakeTopPx} stroke="black" strokeWidth={2}/>
                        <BallValve x={config.intake.valveXPx} y={config.intake.valveYPx} width={config.intake.pipeWidthPx}
                                   open={flows.inValvePos / 100} horizontal reverse={intakeAuto}
                                   pulleyRadius={valvePulley?.radius ??
                                       (intakeAuto ? config.controller.valveDrive.drivenRadiusM * config.render.m2Px : undefined)}
                                   pulleyAngle={valvePulley?.angle}/>
                    </svg>
                    <ControlSlider top={valvePanel.intakeTopPx} left={valvePanel.leftPx} width={valvePanel.widthPx}
                                   label={lab ? "Dovod" : "Position"}
                                   value={flows.inValvePos} decimals={intakeAuto ? 1 : 0} disabled={intakeAuto}
                                   info={<FlowInfo flow={flows.flowIn}/>}
                                   onChange={(value) => setInput("inValvePos", value)}/>
                    {showReference && (
                        <DisplayVar top={226} left={1180} value={referenceLevel} unit={"m"} name={lab ? "Želeni nivo" : referenceLabel}
                                    decimal={3} variant={"reference"}/>
                    )}
                    <DisplayVar top={262} left={1180} value={model.level} unit={"m"} name={lab ? "Nivo" : "Level"} decimal={3}/>

                    <Outlets showDrain={drainValve} showConsumers={consumers} drainPosition={flows.outValvePos} drainFlow={flows.drain}
                             drainStemFromPx={valvePanel.leftPx + valvePanel.widthPx} enabled={model.consumersEnabled}
                             states={flows.states} flows={flows.consumers}
                             nominal={flows.nominal} supply={flows.supply}/>
                    {drainValve && (
                        <>
                            <ControlSlider top={config.outlets.valveYPx - 45} left={valvePanel.leftPx}
                                           width={valvePanel.widthPx} value={flows.outValvePos}
                                           disabled={drainControl ? drainControl.disabled || countdown.count !== null : Boolean(lab)}
                                           label={lab ? "Odtok" : "Position"}
                                           info={<FlowInfo flow={flows.drain}/>}
                                           onChange={(value) => drainControl
                                               ? drainControl.onChange(nearest(drainControl.values, value))
                                               : setInput("outValvePos", value)}/>
                        </>
                    )}
                    {countdown.count !== null && <CountdownOverlay count={countdown.count}/>}
                </Scheme>

                {chart ?? <Chart history={model.history} reference={referenceLevel} duration={duration} showDrain={drainValve}
                       showConsumers={consumers} metric={metric}/>}
            </div>
        </>
    );
};

export default TankPlant;
