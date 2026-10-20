import {useTankModel} from "../context/useTankModel";
import {modelFlows, TANK} from "../simulation/reducer";
import TankPlant from "../components/TankPlant";

//Grade 7: get to know the tank with the intake and drain valves; fill and drain times, steady states
const TankModel = () => {
    const {model, setStatus, setInput} = useTankModel(TANK);

    return <TankPlant model={model} flows={modelFlows(model)} setStatus={setStatus} setInput={setInput}/>;
};

export default TankModel;
