import {createRef, useContext, useEffect, useRef, useState} from "react";
import {AppContext} from "../../context/contex";
import Valve from "../Valve";
import modelImage from "./ManualControlModel.png";
import {Button, ButtonGroup, ProgressBar} from "react-bootstrap";
import FluidTank from "../FluidTank";
import SliderControl from "../SliderControl";
import ReactBootstrapSlider from "react-bootstrap-slider/dist/react-bootstrap-slider";


const TabManual = () => {

    let valvePositionReport1 = (value) => {
        console.log("Valve 1 " + value);
    }

    let valvePositionReport2 = (value) => {
        console.log("Valve 2 " + value);
    }

    return (

        <div style={{
            marginTop: "20px",
            marginLeft: "40px",
            height: "800px",
            width: "1500px",
            backgroundImage: `url(${modelImage})`,
            backgroundSize: "1500px"
        }}>
            <FluidTank flow={100} level={100}/>
            <Valve top={325} left={115} valvePositionReport={valvePositionReport1}/>
            <Valve top={470} left={115} valvePositionReport={valvePositionReport2}/>
            <div style={{
                position: "absolute",
                top: 711,
                left: 100,
                backgroundColor: "#fd8000",
                borderStyle: "solid",
                borderColor: "#AEB6BF",
                borderWidth: "2px",
                borderRadius: "5px",
                padding: "20px",
            }}>
                <div className={"d-flex flex-column"}>
                    <div className={"p-1"}><h5>Application control</h5></div>
                    <div className={"d-flex"}>
                        <div className={"p-1"}> <Button variant="dark" size="lg">Start</Button></div>
                        <div className={"p-1"}> <Button variant="dark" size="lg">Stop</Button></div>
                        <div className={"p-1"}> <Button variant="dark" size="lg">Reset</Button></div>
                    </div>
                </div>
            </div>
        </div>


    )
}

export default TabManual;