import {HashRouter, Navigate, Route, Routes} from "react-router-dom";
import Layout from "./Layout";
import ManualControl from "./pages/ManualControl";
import MechanicalControl from "./pages/MechanicalControl";
import OperatorControl from "./pages/OperatorControl";
import TankModel from "./pages/TankModel";
import MechanicalTuning from "./pages/MechanicalTuning";
import MechanicalLoad from "./pages/MechanicalLoad";
import MechanicalPi from "./pages/MechanicalPi";
import LabPage from "./pages/LabPage";
import BuildPage from "./pages/BuildPage";

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/vaja/6" replace/>}/>
                <Route path="/vaja/:grade" element={<LabPage/>}/>
                <Route path="/sestavi" element={<BuildPage/>}/>
                <Route path="/" element={<Layout/>}>
                    <Route path="operator" element={<OperatorControl/>}/>
                    <Route path="tank" element={<TankModel/>}/>
                    <Route path="tuning" element={<MechanicalTuning/>}/>
                    <Route path="load" element={<MechanicalLoad/>}/>
                    <Route path="pi" element={<MechanicalPi/>}/>
                    <Route path="manual" element={<ManualControl/>}/>
                    <Route path="mechanical" element={<MechanicalControl/>}/>
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
