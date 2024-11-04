import {useContext, useEffect} from "react";
import {AppContext} from "../context/contex";
import Valve from "../components/Valve";
import modelImage from "../img/model.png";
import FluidTank from "../components/FluidTank";
import DisplayVar from "../components/DisplayVar";
import Evaluate from "../components/Evaluate";
import DisplayVarEval from "../components/DisplayVarEval";
import Operate from "../components/Operate";
import Chart from "../components/Chart";
import {Button, ButtonGroup, Row} from "react-bootstrap";

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
        let interval;
        if (context.manual_operate === "RUN") {
            interval = setInterval(() => {
                //Set time
                let time = parseFloat((context.manual_time + config.parameters.simulation.step).toFixed(1));
                context.set_manual_time(time);

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
        }
        return () => {
            if (interval) clearInterval(interval);
        }
    }, [context.manual_time, context.manual_operate]);

    useEffect(() => {
        switch (context.manual_operate) {
            case "RUN": {

            }
                break;
            case "STOP": {

            }
                break;
            case "RESET": {
                context.set_manual_time(0);
                context.set_manual_tankLevel(0);
                context.set_manual_dataTime([]);
                context.set_manual_dataTankLevel([]);
                context.set_manual_dataReferenceLevel([]);
                context.set_manual_dataError([]);
                console.log("RESET");
            }
                break;
        }

    }, [context.manual_operate]);

    //Change of valve intake position
    useEffect(() => {
        context.set_manual_tankFlowInp(config.parameters.intake.flow_max * context.manual_valveInpPos / 100)
    }, [context.manual_valveInpPos]);

    //Change of valve output position
    useEffect(() => {
        context.set_manual_tankFlowOut(Math.sqrt(2 * 9.81 * context.manual_tankLevel) * context.manual_valveOutPos / 100 / config.parameters.drain.valveConstant)
    }, [context.manual_valveOutPos, context.manual_time]);

    useEffect(() => {
        //Chart data
        //if context.manual_time shows 1 or 2 or 3 etc. seconds

        if (context.manual_time*10 % 1 === 0) {
            context.set_manual_dataTime([...context.manual_dataTime, context.manual_time]);
            context.set_manual_dataTankLevel([...context.manual_dataTankLevel, context.manual_tankLevel]);
            context.set_manual_dataReferenceLevel([...context.manual_dataReferenceLevel, config.parameters.evaluationManual.referenceLevel]);
            let error = Math.abs(context.manual_tankLevel - config.parameters.evaluationManual.referenceLevel);
            let oldError = context.manual_dataError[context.manual_dataError.length - 1];
            if (oldError === undefined || NaN) oldError = 0;
            context.set_manual_dataError([...context.manual_dataError, oldError + error]);
        }
    }, [context.manual_time])

    return (

        <div style={{
            marginTop: "6px",
            marginLeft: "40px",
            height: "700px",
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
            <DisplayVar top={210} left={290} value={context.manual_tankFlowInp} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
            <DisplayVar top={595} left={290} value={context.manual_tankFlowOut} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
            <DisplayVarEval top={705} left={600} value={config.parameters.evaluationManual.referenceLevel} unit={"m"}
                            name={"Reference"} decimal={5}/>
            <Row className={"d-flex justify-content-center"} style={{paddingTop: "730px"}}>
                <Operate state={context.manual_operate} stateReport={(state) => context.set_manual_operate(state)}/>
            </Row>

            <Chart data={{
                time: context.manual_dataTime,
                level: context.manual_dataTankLevel,
                reference: context.manual_dataReferenceLevel,
                error: context.manual_dataError
            }}/>

        </div>


    )
}

export default ManualControl;