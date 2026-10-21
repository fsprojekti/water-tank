import config from "../config";
import {useTankModel} from "../context/useTankModel";
import {intakePosition, modelFlows} from "../simulation/reducer";
import {beltRatio} from "../simulation/controller";
import ControlSlider from "./ControlSlider";
import RackDrive from "./RackDrive";
import IntegralDrive from "./IntegralDrive";
import TankPlant from "./TankPlant";

const {kpLimits, h0Limits} = config.controller;
//Settings panels under the intake valve panel, top of each [Px]
const {valvePanel} = config.render;
const settingsTopPx = [450, 540, 614];

//Second line of a settings panel
const Info = ({label, value}) => (
    <>
        <span>{label}</span>
        <span>{value}</span>
    </>
);

//Tank driven by the mechanical controller: rack on the pontoon, pinion on a carriage, belt to the intake valve
const MechanicalPlant = ({mode}) => {
    const {model, setStatus, setInput} = useTankModel(mode);
    const flows = modelFlows(model);
    const {integral, turbine, lockSettings} = config.evaluation[mode];
    //Some tasks fix the settings once the run started
    const locked = Boolean(lockSettings) && model.step > 0;

    return (
        <TankPlant model={model} flows={flows} setStatus={setStatus} setInput={setInput} intakeAuto>
            <RackDrive level={model.level} kp={model.kp} h0={model.h0} opening={intakePosition(model)}
                       crank={!integral}/>
            {integral && (
                <IntegralDrive level={model.level} h0={model.h0} reference={model.referenceLevel}
                               pitch={turbine.pitchM} gain={model.turbineGain} unitGain={turbine.unitGain}/>
            )}
            <ControlSlider top={settingsTopPx[0]} left={valvePanel.leftPx} width={valvePanel.widthPx}
                           label={"Gain Kp"} unit={"1/m"} decimals={1}
                           min={kpLimits[0]} max={kpLimits[1]} step={0.1}
                           info={<Info label={"Belt ratio:"} value={`${beltRatio(model.kp).toFixed(2)} : 1`}/>}
                           value={model.kp} disabled={locked} onChange={(value) => setInput("kp", value)}/>
            <ControlSlider top={settingsTopPx[1]} left={valvePanel.leftPx} width={valvePanel.widthPx}
                           label={integral ? "Start h0" : "Close at h0"} unit={"m"} decimals={2}
                           min={h0Limits[0]} max={h0Limits[1]} step={0.01}
                           value={model.h0} disabled={locked} onChange={(value) => setInput("h0", value)}/>
            {integral && (
                <ControlSlider top={settingsTopPx[2]} left={valvePanel.leftPx} width={valvePanel.widthPx}
                               label={"Turbine Ki"} unit={"1/s"} decimals={2}
                               min={turbine.gainLimits[0]} max={turbine.gainLimits[1]} step={0.05}
                               info={<Info label={"Belt ratio:"}
                                           value={`${(model.turbineGain / turbine.unitGain).toFixed(2)} : 1`}/>}
                               value={model.turbineGain} disabled={locked}
                               onChange={(value) => setInput("turbineGain", value)}/>
            )}
        </TankPlant>
    );
};

export default MechanicalPlant;
