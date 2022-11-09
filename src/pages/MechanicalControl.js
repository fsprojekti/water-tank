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
import Slider from "../components/Slider";

const config = require('../config');


const MechanicalControl = () => {

    const context = useContext(AppContext);


    let valvePositionReport2 = (value) => {
        context.set_mechanical_valveOutPos(value);
    }

    let l3Report = (value) => {
        context.set_l3(value);
    }

    let l4Report = (value) => {
        context.set_l4(value);
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
    //Change of valve intake position
    useEffect(() => {
        context.set_mechanical_tankFlowInp(config.parameters.intake.flow_max * context.mechanical_valveInpPos / 100)
    }, [context.mechanical_valveInpPos]);

    //Change of mechanical regulator position
    useEffect(() => {
        let value = -1.25 * context.governorPositionPx + 237.5;
        if (value > 100) value = 100;
        if (value < 0) value = 0;
        context.set_mechanical_valveInpPos(value);
    }, [context.governorPositionPx]);


    //Change of valve output position
    useEffect(() => {
        context.set_mechanical_tankFlowOut(Math.sqrt(2 * 9.81 * context.mechanical_tankLevel) * context.mechanical_valveOutPos / 100 / config.parameters.drain.valveConstant)
    }, [context.mechanical_valveOutPos, context.mechanical_time]);

    // useEffect(() => {
    //     context.set_coordinateYPlatoonPx(config.parameters.tank.offsetPx
    //         -context.mechanical_tankLevel *config.parameters.tank.height *config.parameters.render.m2Px
    //     -config.parameters.pontoon.heightPx);
    // }, [context.mechanical_tankLevel]);

    return (

        <div style={{
            marginTop: "6px",
            marginLeft: "40px",
            height: "800px",
            width: "1500px",
            backgroundImage: `url(${modelImage})`,
            backgroundSize: "1500px"
        }}>
            <FluidTank level={context.mechanical_tankLevel * 100}
                       heightPx={config.parameters.tank.height * config.parameters.render.m2Px}
                       offsetPx={config.parameters.tank.offsetPx}
                       flow={context.mechanical_tankFlowInp / config.parameters.intake.flow_max * 100}>
            </FluidTank>
            <ValveDisabled top={325} left={115} position={context.mechanical_valveInpPos}/>
            <Valve top={470} left={115} valvePositionReport={valvePositionReport2}/>
            <DisplayVar top={705} left={880} value={context.mechanical_tankLevel} unit={"m"} name={"Level"}
                        decimal={3}/>
            <DisplayVar top={210} left={290} value={context.mechanical_tankFlowInp} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
            <DisplayVar top={595} left={290} value={context.mechanical_tankFlowOut} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
            {/*<DisplayVarEval top={750} left={850} value={context.manualController.parameters.referenceHeight} unit={"m"}*/}
            {/*                name={"Reference"} decimal={5}/>*/}
            <Slider
                top={60}
                left={1200}
                valvePositionReport={l3Report}
                name={"Rod horizontal"}
                unit={"m"}
                min={config.parameters.controller.l3Limits[0]}
                max={config.parameters.controller.l3Limits[1]}
                position={context.l3}
            />
            <Slider top={160}
                    left={1200}
                    valvePositionReport={l4Report}
                    name={"Rod vertical"}
                    unit={"m"}
                    min={config.parameters.controller.l4Limits[0]}
                    max={config.parameters.controller.l4Limits[1]}
                    position={context.l4}
            />
            {/*<Evaluate*/}
            {/*    top={720}*/}
            {/*    left={100}*/}
            {/*    timeMax={context.manualController.parameters.measureTime}*/}
            {/*    time={context.mechanical_evaluateTime}*/}
            {/*    error={context.mechanical_evaluateError / (context.manualController.parameters.measureTime * context.manualController.parameters.simulation_step * context.manualController.parameters.referenceHeight)}*/}
            {/*/>*/}
            <Canvas p1={context.p1} level={context.mechanical_tankLevel}/>


        </div>


    )
}

export default MechanicalControl;