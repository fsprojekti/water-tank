import config from "../config";
import {useTankModel} from "../context/useTankModel";
import {modelFlows} from "../simulation/reducer";
import ControlSlider from "./ControlSlider";
import Canvas from "./Canvas";
import IntegralDrive from "./IntegralDrive";
import TankPlant from "./TankPlant";

const {l3Limits, l4Limits} = config.controller;
//Settings panels under the intake valve panel, top of each [Px]
const {valvePanel} = config.render;
const settingsTopPx = [448, 516, 584];

//Tank driven by the mechanical controller: pontoon linkage with adjustable rods
const MechanicalPlant = ({mode}) => {
    const {model, setStatus, setInput} = useTankModel(mode);
    const flows = modelFlows(model);
    //Some tasks fix the rods once the run started
    const rodsLocked = Boolean(config.evaluation[mode].lockRods) && model.step > 0;
    const {integral, turbine} = config.evaluation[mode];

    return (
        <TankPlant model={model} flows={flows} setStatus={setStatus} setInput={setInput} intakeAuto>
            <Canvas level={model.level} l3={model.l3} l4={model.l4}/>
            {integral && (
                <IntegralDrive level={model.level} l3={model.l3} l4={model.l4} reference={model.referenceLevel}
                               pitch={turbine.pitchM} gain={model.turbineGain} unitGain={turbine.unitGain}/>
            )}
            <ControlSlider top={settingsTopPx[0]} left={valvePanel.leftPx} width={valvePanel.widthPx}
                           label={"Rod l3"} unit={"m"} decimals={2}
                           min={l3Limits[0]} max={l3Limits[1]} step={0.01}
                           value={model.l3} disabled={rodsLocked} onChange={(value) => setInput("l3", value)}/>
            <ControlSlider top={settingsTopPx[1]} left={valvePanel.leftPx} width={valvePanel.widthPx}
                           label={"Rod l4"} unit={"m"} decimals={2}
                           min={l4Limits[0]} max={l4Limits[1]} step={0.01}
                           value={model.l4} disabled={rodsLocked} onChange={(value) => setInput("l4", value)}/>
            {integral && (
                <ControlSlider top={settingsTopPx[2]} left={valvePanel.leftPx} width={valvePanel.widthPx}
                               label={"Turbine Ki"} unit={"1/s"} decimals={2}
                               min={turbine.gainLimits[0]} max={turbine.gainLimits[1]} step={0.05}
                               value={model.turbineGain} disabled={rodsLocked}
                               info={<><span>Belt ratio:</span><span>{(model.turbineGain / turbine.unitGain).toFixed(2)} : 1</span></>}
                               onChange={(value) => setInput("turbineGain", value)}/>
            )}
        </TankPlant>
    );
};

export default MechanicalPlant;
