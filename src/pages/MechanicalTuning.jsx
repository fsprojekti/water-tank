import {TUNING} from "../simulation/reducer";
import MechanicalPlant from "../components/MechanicalPlant";

//Grade 8: rod lengths of the mechanical controller against steady level and time constant
const MechanicalTuning = () => <MechanicalPlant mode={TUNING}/>;

export default MechanicalTuning;
