import logo from './logo.svg';
import './App.css';
import {useContext, useEffect} from "react";
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
