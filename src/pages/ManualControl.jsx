import {useTankModel} from "../context/useTankModel";
import {MANUAL, modelFlows} from "../simulation/reducer";
import TankPlant from "../components/TankPlant";

const ManualControl = () => {
    const {model, setStatus, setInput} = useTankModel(MANUAL);

    return (
        <TankPlant model={model} flows={modelFlows(model)} setStatus={setStatus} setInput={setInput}/>
    );
};

export default ManualControl;
