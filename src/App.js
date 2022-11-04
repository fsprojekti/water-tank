import logo from './logo.svg';
import './App.css';
import {useContext, useEffect, useState} from "react";
import {AppContext} from "./context/contex";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import {Nav} from "react-bootstrap";
import TabManual from "./components/tabs/TabManual";
import TabMechanical from "./components/tabs/TabMechanical";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-slider/dist/css/bootstrap-slider.css"
import {BrowserRouter, Link, Route, Routes} from "react-router-dom";
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
