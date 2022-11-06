import {useContext, useEffect} from "react";
import {AppContext} from "../context/contex";
import Valve from "../components/Valve";
import modelImage from "../img/model.png";
import FluidTank from "../components/FluidTank";
import DisplayVar from "../components/DisplayVar";
import Evaluate from "../components/Evaluate";
import DisplayVarEval from "../components/DisplayVarEval";
import Canvas from "../components/Canvas";
import ValveDisabled from "../components/ValveDisabled";


const MechanicalControl = () => {

    const context = useContext(AppContext);

    let valvePositionReport1 = (value) => {
        context.set_mechanical_valveInpPos(value);
    }

    let valvePositionReport2 = (value) => {
        context.set_mechanical_valveOutPos(value);
    }

    let platoonRodLength = (value) => {
        //context.set_platoonRodLengthPx(value / 100 * context.mechanicalParameters.platoonRodLengthMaxPx);
    }

    let swingRodPivot = (value) => {
        // let x=value/100*(context.mechanicalParameters.swingPointLimitsPx[1]-context.mechanicalParameters.swingPointLimitsPx[0])+context.mechanicalParameters.swingPointLimitsPx[0];
        // context.set_pointSwingPx([x,context.pointSwingPx[1]]);
        // context.set_valueSwing(value/100);
    }

    //Simulation model control
    useEffect(() => {
        const interval = setInterval(() => {
            //Set time
            context.set_mechanical_time(context.mechanical_time + context.manualController.parameters.simulation_step);

            if (context.mechanical_tankLevel > 0 && context.mechanical_evaluateTime < context.manualController.parameters.measureTime) {
                context.set_mechanical_evaluateStart(true);
            } else context.set_mechanical_evaluateStart(false);

            if (context.mechanical_evaluateStart) {
                context.set_mechanical_evaluateTime(context.mechanical_evaluateTime + context.manualController.parameters.simulation_step);
                context.set_mechanical_evaluateError(context.mechanical_evaluateError + Math.abs(context.mechanical_tankLevel - context.manualController.parameters.referenceHeight) * context.manualController.parameters.simulation_step);
                // console.log(Math.abs(context.mechanical_tankLevel - context.manualController.parameters.referenceHeight))
            }


            let flowDiff = context.mechanical_tankFlowInp - context.mechanical_tankFlowOut;
            //console.log("Tank flow inp: " + context.tankFlowInp);
            let dVolume = flowDiff * context.manualController.parameters.simulation_step;
            let dLevel = dVolume / context.manualController.parameters.tank_area;
            let newLevel = context.mechanical_tankLevel + dLevel;
            if (newLevel < 0) {
                newLevel = 0;
            }
            if (newLevel > context.manualController.parameters.tank_height) {
                newLevel = context.manualController.parameters.tank_height;
            }
            context.set_mechanical_tankLevel(newLevel);
        }, context.manualController.parameters.simulation_step * 1000);
        return () => clearInterval(interval);
    }, [context.mechanical_time]);
    //
    // //Change of valve intake position
    useEffect(() => {
        context.set_mechanical_tankFlowInp(context.manualController.parameters.tankFlowInpMax * context.mechanical_valveInpPos / 100)
    }, [context.mechanical_valveInpPos]);

    //Change of mechanical regulator position
    useEffect(() => {
        let value = -1.25 * context.pointValveInpPx[1] + 237.5;
        if (value > 100) value = 100;
        if (value < 0) value = 0;
        context.set_valveInpPos(value);
    }, [context.pointValveInpPx]);
    //
    //Change of valve output position
    useEffect(() => {
        context.set_mechanical_tankFlowOut(Math.sqrt(2 * 9.81 * context.mechanical_tankLevel) * context.mechanical_valveOutPos / 100 / context.manualController.parameters.valve_out_k)
    }, [context.mechanical_valveOutPos, context.mechanical_time]);

    return (

        <div style={{
            marginTop: "6px",
            marginLeft: "40px",
            height: "800px",
            width: "1500px",
            backgroundImage: `url(${modelImage})`,
            backgroundSize: "1500px"
        }}>
            <FluidTank flow={context.mechanical_tankFlowInp / context.manualController.parameters.tankFlowInpMax * 100}
                       level={context.mechanical_tankLevel / context.manualController.parameters.tank_height * 100}/>
            <ValveDisabled top={325} left={115} position={context.valveInpPos}/>
            <Valve top={470} left={115} valvePositionReport={valvePositionReport2}/>
            <DisplayVar top={705} left={880} value={context.mechanical_tankLevel} unit={"m"} name={"Level"}
                        decimal={3}/>
            <DisplayVar top={210} left={290} value={context.mechanical_tankFlowInp} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
            <DisplayVar top={595} left={290} value={context.mechanical_tankFlowOut} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
            <DisplayVarEval top={750} left={850} value={context.manualController.parameters.referenceHeight} unit={"m"}
                            name={"Reference"} decimal={5}/>
            <Valve top={60} left={1200} valvePositionReport={platoonRodLength}/>
            <Valve top={160} left={1200} valvePositionReport={swingRodPivot}/>
            <Evaluate
                top={720}
                left={100}
                timeMax={context.manualController.parameters.measureTime}
                time={context.mechanical_evaluateTime}
                error={context.mechanical_evaluateError / (context.manualController.parameters.measureTime * context.manualController.parameters.simulation_step * context.manualController.parameters.referenceHeight)}
            />
            <Canvas p1={context.p1} tankLevel={context.mechanical_tankLevel}/>


        </div>


    )
}

export default MechanicalControl;