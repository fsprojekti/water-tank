import {useContext, useEffect} from "react";
import {AppContext} from "../context/contex";
import Valve from "../components/Valve";
import modelImage from "../img/model.png";
import FluidTank from "../components/FluidTank";
import DisplayVar from "../components/DisplayVar";
import Evaluate from "../components/Evaluate";
import DisplayVarEval from "../components/DisplayVarEval";
const config = require('../config');


const ManualControl = () => {

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
            context.set_manual_time(context.manual_time + config.parameters.simulation.step);

            if (context.manual_tankLevel > 0 && context.manual_evaluateTime < config.parameters.evaluationManual.duration) {
                context.set_manual_evaluateStart(true);
            } else context.set_manual_evaluateStart(false);

            if (context.manual_evaluateStart) {
                context.set_manual_evaluateTime(context.manual_evaluateTime + config.parameters.simulation.step);
                context.set_manual_evaluateError(context.manual_evaluateError + Math.abs(context.manual_tankLevel - context.manualController.parameters.referenceHeight) * config.parameters.simulation.step);
                // console.log(Math.abs(context.manual_tankLevel - context.manualController.parameters.referenceHeight))
            }


            let flowDiff = context.manual_tankFlowInp - context.manual_tankFlowOut;
            //console.log("Tank flow inp: " + context.tankFlowInp);
            let dVolume = flowDiff * config.parameters.simulation.step;
            let dLevel = dVolume / config.parameters.tank.area;
            let newLevel = context.manual_tankLevel + dLevel;
            if (newLevel < 0) {
                newLevel = 0;
            }
            if (newLevel > config.parameters.tank.height) {
                newLevel = config.parameters.tank.height;
            }
            context.set_manual_tankLevel(newLevel);
        }, config.parameters.simulation.step * 1000);
        return () => clearInterval(interval);
    }, [context.manual_time]);
    //
    //Change of valve intake position
    useEffect(() => {
        context.set_manual_tankFlowInp(config.parameters.intake.flow_max * context.manual_valveInpPos / 100)
    }, [context.manual_valveInpPos]);

    //Change of valve output position
    useEffect(() => {
        context.set_manual_tankFlowOut(Math.sqrt(2 * 9.81 * context.manual_tankLevel) * context.manual_valveOutPos / 100 / config.parameters.drain.valveConstant)
    }, [context.manual_valveOutPos, context.manual_time]);

    return (

        <div style={{
            marginTop: "6px",
            marginLeft: "40px",
            height: "800px",
            width: "1500px",
            backgroundImage: `url(${modelImage})`,
            backgroundSize: "1500px"
        }}>
            <FluidTank flow={context.manual_tankFlowInp / config.parameters.intake.flow_max * 100}
                       heightPx={config.parameters.tank.height * config.parameters.render.m2Px}
                       offsetPx={config.parameters.tank.offsetPx}
                       level={context.manual_tankLevel / config.parameters.tank.height * 100}/>
            <Valve top={325} left={115} valvePositionReport={valvePositionReport1}/>
            <Valve top={470} left={115} valvePositionReport={valvePositionReport2}/>
            <DisplayVar top={705} left={880} value={context.manual_tankLevel} unit={"m"} name={"Level"} decimal={3}/>
            <DisplayVar top={210} left={290} value={context.manual_tankFlowInp} unit={"m³/s"} name={"Flow"} decimal={5}/>
            <DisplayVar top={595} left={290} value={context.manual_tankFlowOut} unit={"m³/s"} name={"Flow"} decimal={5}/>
            {/*<DisplayVarEval top={750} left={850} value={context.manualController.parameters.referenceHeight} unit={"m"}*/}
            {/*                name={"Reference"} decimal={5}/>*/}


            <Evaluate
                top={720}
                left={100}
                timeMax={config.parameters.evaluationManual.duration}
                time={context.manual_evaluateTime}
                error={context.manual_evaluateError / (config.parameters.evaluationManual.duration * config.parameters.simulation.step * config.parameters.evaluationManual.referenceLevel)}
            />
        </div>


    )
}

export default ManualControl;