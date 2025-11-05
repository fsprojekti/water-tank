import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

import ManualControl from './pages/ManualControl.jsx';
import MechanicalControl from './pages/MechanicalControl.jsx';
import ElectronicControl from './pages/ElectronicControl.jsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import Navigation from './components/Navigation.jsx';

import { TankProvider } from './contexts/TankContext.jsx';
import { ManualProvider } from './contexts/ManualContext.jsx';
import { MechanicalProvider } from './contexts/MechanicalContext.jsx';

import config from '../config.json'; // adjust path if needed

export default function App() {
    const ManualPage = ManualControl;

    return (
        <BrowserRouter>
            <Navigation />

            <Routes>
                <Route path="/" element={<Navigate to="/manual" replace />} />

                {/* Manual page: needs TankProvider + ManualProvider */}
                <Route
                    path="/manual"
                    element={
                        <TankProvider config={config} autostart={false}>
                            <ManualProvider>
                                <ManualPage />
                            </ManualProvider>
                        </TankProvider>
                    }
                />

                {/* Mechanical page: if it also reads/writes tank level/flows, wrap it too */}
                <Route
                    path="/mechanical"
                    element={
                        <TankProvider config={config} autostart={false}>
                            <MechanicalProvider>
                                <MechanicalControl />
                            </MechanicalProvider>
                        </TankProvider>
                    }
                />

                <Route path="/electronic" element={<ElectronicControl />} />

                <Route path="*" element={<div style={{ padding: 16 }}><h1>404 – Page not found</h1></div>} />
            </Routes>
        </BrowserRouter>
    );
}
