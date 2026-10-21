import {LOAD} from "../simulation/reducer";
import MechanicalPlant from "../components/MechanicalPlant";

//Grade 9: rods chosen once must hold the reference while consumers draw water
const MechanicalLoad = () => <MechanicalPlant mode={LOAD}/>;

export default MechanicalLoad;
