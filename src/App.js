import logo from './logo.svg';
import './App.css';
import {useContext, useEffect, useState} from "react";
import {AppContext} from "./context/contex";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import {Nav} from "react-bootstrap";
import TabManual from "./components/tabManual/TabManual";
import TabMechanical from "./components/TabMechanical";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-slider/dist/css/bootstrap-slider.css"

function App() {
    const context = useContext(AppContext);

    //Simulation model control
    useEffect(() => {
        const interval = setInterval(() => {
            //Set time
            context.setTime(context.time + context.parameters.simulation_step);

            if (context.tankLevel > 0 && context.evaluateTime < context.parameters.measureTime) {
                context.setEvaluateStart(true);
            }else context.setEvaluateStart(false);

            if (context.evaluateStart) {
                context.setEvaluateTime(context.evaluateTime + context.parameters.simulation_step);
                context.setEvaluateError(context.evaluateError + Math.abs(context.tankLevel - context.parameters.referenceHeight)*context.parameters.simulation_step);
                console.log(Math.abs(context.tankLevel - context.parameters.referenceHeight))
            }


            let flowDiff= context.tankFlowInp - context.tankFlowOut;
            //console.log("Tank flow inp: " + context.tankFlowInp);
            let dVolume = flowDiff * context.parameters.simulation_step;
            let dLevel = dVolume / context.parameters.tank_area;
            let newLevel = context.tankLevel + dLevel;
            if (newLevel < 0) {
                newLevel = 0;
            }
            if (newLevel > context.parameters.tank_height) {
                newLevel = context.parameters.tank_height;
            }
            context.setTankLevel(newLevel);
        }, context.parameters.simulation_step * 1000);
        return () => clearInterval(interval);
    }, [context.time]);

    //Change of valve intake position
    useEffect(() => {
        context.setTankFlowInp(context.tankFlowInpMax * context.valveInpPos / 100)
    }, [context.valveInpPos]);

    //Change of valve output position
    useEffect(() => {
        context.setTankFlowOut(Math.sqrt(2*9.81*context.tankLevel) * context.valveOutPos / 100/context.parameters.valve_out_k)
    }, [context.valveOutPos, context.time]);


    return (
        <div className="App">
            <Nav variant="tabs" fill
                 defaultActiveKey={context.app.tab}
                 onSelect={(selectedKey) => context.setApp({tab: selectedKey})}>
                <Nav.Item>
                    <Nav.Link eventKey="MANUAL_CONTROLLER">Manual controller</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link eventKey="MECHANICAL_CONTROLLER">Mechanical controller</Nav.Link>
                </Nav.Item>
            </Nav>
            {context.app.tab === "MANUAL_CONTROLLER" ?
                <TabManual/>
                :
                <TabMechanical/>
            }
        </div>
    );
}

export default App;
