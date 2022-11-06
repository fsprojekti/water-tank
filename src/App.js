import './App.css';
import "bootstrap/dist/css/bootstrap.css";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./Layout";
import ManualControl from "./pages/ManualControl";
import MechanicalControl from "./pages/MechanicalControl";

function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<ManualControl />} />
                    <Route path="manual" element={<ManualControl />} />
                    <Route path="mechanical" element={<MechanicalControl />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
