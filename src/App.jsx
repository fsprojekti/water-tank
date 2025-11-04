import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import './App.css';

// If you already created this file earlier, keep this import.
// Otherwise, comment it out and use the inline <ManualPage /> below.
import ManualControl from './pages/ManualControl.jsx';
import MechanicalControl from "./pages/MechanicalControl.jsx";
import ElectronicControl from "./pages/ElectronicControl.jsx";

import 'bootstrap/dist/css/bootstrap.min.css';
import Navigation from "./components/Navigation.jsx";
import {MechanicalProvider} from "./contexts/MechanicalContext.jsx";
import {ManualProvider} from "./contexts/ManualContext.jsx";

export default function App() {
    const ManualPage = ManualControl;

    return (
        <BrowserRouter /* basename="/your-subpath" if needed */>
            <Navigation/>

            <Routes>
                <Route path="/" element={<Navigate to="/manual" replace/>}/>
                <Route path="/manual" element={
                    <ManualProvider>
                        <ManualPage/>
                    </ManualProvider>}/>
                <Route path="/mechanical" element={
                    <MechanicalProvider>
                        <MechanicalControl/>
                    </MechanicalProvider>}/>
                <Route path="/electronic" element={<ElectronicControl/>}/>
                <Route path="*" element={<div style={{padding: 16}}><h1>404 – Page not found</h1></div>}/>
            </Routes>
        </BrowserRouter>
    );
}
