import React from 'react';
import ReactDOM from 'react-dom/client';
import "bootstrap/dist/css/bootstrap.min.css";
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import './index.css';
import App from './App';
import SimulationProvider from "./context/SimulationProvider";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <SimulationProvider>
        <App/>
    </SimulationProvider>
);
