import {createRef, useContext, useEffect, useRef, useState} from "react";
import {AppContext} from "../../context/contex";
import Valve from "../Valve";
import modelImage from "./ManualControlModel.png";
import {Button, ButtonGroup, ProgressBar} from "react-bootstrap";
import FluidTank from "../FluidTank";
import SliderControl from "../SliderControl";
import ReactBootstrapSlider from "react-bootstrap-slider/dist/react-bootstrap-slider";
import DisplayVar from "../DisplayVar";
import Evaluate from "../Evaluate";
import DisplayVarEval from "../DisplayVarEval";


const TabManual = () => {

    const context = useContext(AppContext);

    let valvePositionReport1 = (value) => {
        context.setValveInpPos(value);
    }

    let valvePositionReport2 = (value) => {
        context.setValveOutPos(value);
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
            <FluidTank flow={context.tankFlowInp/context.tankFlowInpMax*100} level={context.tankLevel/context.parameters.tank_height*100}/>
            <Valve top={325} left={115} valvePositionReport={valvePositionReport1}/>
            <Valve top={470} left={115} valvePositionReport={valvePositionReport2}/>
            <DisplayVar top={705} left={880} value={context.tankLevel} unit={"m"} name={"Level"} decimal={3}/>
            <DisplayVar top={210} left={290} value={context.tankFlowInp} unit={"m³/s"} name={"Flow"} decimal={5}/>
            <DisplayVar top={595} left={290} value={context.tankFlowOut} unit={"m³/s"} name={"Flow"} decimal={5}/>
            <DisplayVarEval top={750} left={850} value={context.parameters.referenceHeight} unit={"m"} name={"Reference"} decimal={5}/>
            <Evaluate
                top={720}
                left={100}
                timeMax={context.parameters.measureTime}
                time={context.evaluateTime}
                error={context.evaluateError/(context.parameters.measureTime*context.parameters.simulation_step*context.parameters.referenceHeight)}
            />
            {/*<div style={{*/}
            {/*    position: "absolute",*/}
            {/*    top: 711,*/}
            {/*    left: 100,*/}
            {/*    backgroundColor: "#fd8000",*/}
            {/*    borderStyle: "solid",*/}
            {/*    borderColor: "#AEB6BF",*/}
            {/*    borderWidth: "2px",*/}
            {/*    borderRadius: "5px",*/}
            {/*    padding: "20px",*/}
            {/*}}>*/}
            {/*    <div className={"d-flex flex-column"}>*/}
            {/*        <div className={"p-1"}><h5>Application control</h5></div>*/}
            {/*        <div className={"d-flex"}>*/}
            {/*            <div className={"p-1"}> <Button variant="dark" size="lg">Start</Button></div>*/}
            {/*            <div className={"p-1"}> <Button variant="dark" size="lg">Stop</Button></div>*/}
            {/*            <div className={"p-1"}> <Button variant="dark" size="lg">Reset</Button></div>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}
        </div>


    )
}

export default TabManual;