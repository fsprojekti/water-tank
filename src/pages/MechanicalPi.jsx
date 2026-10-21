import {PI} from "../simulation/reducer";
import MechanicalPlant from "../components/MechanicalPlant";

//Grade 10: the turbine adds integral action to the mechanical controller
const MechanicalPi = () => <MechanicalPlant mode={PI}/>;

export default MechanicalPi;
