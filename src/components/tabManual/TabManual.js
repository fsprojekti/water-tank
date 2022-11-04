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
        context.set_manual_valveInpPos(value);
    }

    let valvePositionReport2 = (value) => {
        context.set_manual_valveOutPos(value);
    }

    //Simulation model control
    useEffect(() => {
        const interval = setInterval(() => {
            //Set time
            context.set_manual_time(context.manual_time + context.manualController.parameters.simulation_step);

            if (context.manual_tankLevel > 0 && context.manual_evaluateTime < context.manualController.parameters.measureTime) {
                context.set_manual_evaluateStart(true);
            } else context.set_manual_evaluateStart(false);

            if (context.manual_evaluateStart) {
                context.set_manual_evaluateTime(context.manual_evaluateTime + context.manualController.parameters.simulation_step);
                context.set_manual_evaluateError(context.manual_evaluateError + Math.abs(context.manual_tankLevel - context.manualController.parameters.referenceHeight) * context.manualController.parameters.simulation_step);
               // console.log(Math.abs(context.manual_tankLevel - context.manualController.parameters.referenceHeight))
            }


            let flowDiff = context.manual_tankFlowInp - context.manual_tankFlowOut;
            //console.log("Tank flow inp: " + context.tankFlowInp);
            let dVolume = flowDiff * context.manualController.parameters.simulation_step;
            let dLevel = dVolume / context.manualController.parameters.tank_area;
            let newLevel = context.manual_tankLevel + dLevel;
            if (newLevel < 0) {
                newLevel = 0;
            }
            if (newLevel > context.manualController.parameters.tank_height) {
                newLevel = context.manualController.parameters.tank_height;
            }
            context.set_manual_tankLevel(newLevel);
        }, context.manualController.parameters.simulation_step * 1000);
        return () => clearInterval(interval);
    }, [context.manual_time]);
    //
    //Change of valve intake position
    useEffect(() => {
        context.set_manual_tankFlowInp(context.manualController.parameters.tankFlowInpMax * context.manual_valveInpPos / 100)
    }, [context.manual_valveInpPos]);

    //Change of valve output position
    useEffect(() => {
        context.set_manual_tankFlowOut(Math.sqrt(2 * 9.81 * context.manual_tankLevel) * context.manual_valveOutPos / 100 / context.manualController.parameters.valve_out_k)
    }, [context.manual_valveOutPos, context.manual_time]);

    return (

        <div style={{
            marginTop: "20px",
            marginLeft: "40px",
            height: "800px",
            width: "1500px",
            backgroundImage: `url(${modelImage})`,
            backgroundSize: "1500px"
        }}>
            <FluidTank flow={context.manual_tankFlowInp / context.manualController.parameters.tankFlowInpMax * 100}
                       level={context.manual_tankLevel / context.manualController.parameters.tank_height * 100}/>
            <Valve top={325} left={115} valvePositionReport={valvePositionReport1}/>
            <Valve top={470} left={115} valvePositionReport={valvePositionReport2}/>
            <DisplayVar top={705} left={880} value={context.manual_tankLevel} unit={"m"} name={"Level"} decimal={3}/>
            <DisplayVar top={210} left={290} value={context.manual_tankFlowInp} unit={"m³/s"} name={"Flow"} decimal={5}/>
            <DisplayVar top={595} left={290} value={context.manual_tankFlowOut} unit={"m³/s"} name={"Flow"} decimal={5}/>
            <DisplayVarEval top={750} left={850} value={context.manualController.parameters.referenceHeight} unit={"m"}
                            name={"Reference"} decimal={5}/>
            <Evaluate
                top={720}
                left={100}
                timeMax={context.manualController.parameters.measureTime}
                time={context.manual_evaluateTime}
                error={context.manual_evaluateError / (context.manualController.parameters.measureTime * context.manualController.parameters.simulation_step * context.manualController.parameters.referenceHeight)}
            />
        </div>


    )
}

export default TabManual;