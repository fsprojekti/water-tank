import {HashRouter, Route, Routes} from "react-router-dom";
import Layout from "./Layout";
import ManualControl from "./pages/ManualControl";
import MechanicalControl from "./pages/MechanicalControl";
import OperatorControl from "./pages/OperatorControl";
import TankModel from "./pages/TankModel";
import MechanicalTuning from "./pages/MechanicalTuning";

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Layout/>}>
                    <Route index element={<ManualControl/>}/>
                    <Route path="operator" element={<OperatorControl/>}/>
                    <Route path="tank" element={<TankModel/>}/>
                    <Route path="tuning" element={<MechanicalTuning/>}/>
                    <Route path="manual" element={<ManualControl/>}/>
                    <Route path="mechanical" element={<MechanicalControl/>}/>
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
