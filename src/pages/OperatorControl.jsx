import {useTankModel} from "../context/useTankModel";
import {modelFlows, OPERATOR} from "../simulation/reducer";
import TankPlant from "../components/TankPlant";

//Grade 6: the student is the controller and keeps randomly switching consumers supplied
const OperatorControl = () => {
    const {model, setStatus, setInput} = useTankModel(OPERATOR);

    return (
        <TankPlant model={model} flows={modelFlows(model)} setStatus={setStatus} setInput={setInput}/>
    );
};

export default OperatorControl;
