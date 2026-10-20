import config from "../config";
import {useTankModel} from "../context/useTankModel";
import {modelFlows} from "../simulation/reducer";
import ControlSlider from "./ControlSlider";
import Canvas from "./Canvas";
import TankPlant from "./TankPlant";

const {l3Limits, l4Limits} = config.controller;

//Tank driven by the mechanical controller: pontoon linkage with adjustable rods
const MechanicalPlant = ({mode}) => {
    const {model, setStatus, setInput} = useTankModel(mode);
    const flows = modelFlows(model);

    return (
        <TankPlant model={model} flows={flows} setStatus={setStatus} setInput={setInput} intakeAuto>
            <Canvas level={model.level} l3={model.l3} l4={model.l4}/>
            <ControlSlider top={4} left={1160} width={300}
                           label={"Rod horizontal"} unit={"m"} decimals={2}
                           min={l3Limits[0]} max={l3Limits[1]} step={0.01}
                           value={model.l3} onChange={(value) => setInput("l3", value)}/>
            <ControlSlider top={84} left={1160} width={300}
                           label={"Rod vertical"} unit={"m"} decimals={2}
                           min={l4Limits[0]} max={l4Limits[1]} step={0.01}
                           value={model.l4} onChange={(value) => setInput("l4", value)}/>
        </TankPlant>
    );
};

export default MechanicalPlant;
