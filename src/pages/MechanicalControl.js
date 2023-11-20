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
import {Button, ButtonGroup, Row} from "react-bootstrap";
import Operate from "../components/Operate";
import Chart from "../components/Chart";

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
            let interval;
            if (context.mechanical_operate === "RUN") {
                interval = setInterval(() => {
                    //Set time
                    let time = parseFloat((context.mechanical_time + config.parameters.simulation.step).toFixed(1));
                    // console.log(time)
                    context.set_mechanical_time(time);

                    let flowDiff = context.mechanical_tankFlowInp - context.mechanical_tankFlowOut;
                    //console.log("Tank flow inp: " + context.tankFlowInp);
                    let dVolume = flowDiff * config.parameters.simulation.step;
                    let dLevel = dVolume / context.manualController.parameters.tank_area;
                    let newLevel = context.mechanical_tankLevel + dLevel;
                    if (newLevel < 0) {
                        newLevel = 0;
                    }
                    if (newLevel > context.manualController.parameters.tank_height) {
                        newLevel = context.manualController.parameters.tank_height;
                    }
                    context.set_mechanical_tankLevel(newLevel);
                }, config.parameters.simulation.step * 1000);
            }
            return () => {
                clearInterval(interval);
            }
        }, [context.mechanical_time, context.mechanical_operate]
    );

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

    useEffect(() => {
        switch (context.mechanical_operate) {
            case "RUN": {

            }
                break;
            case "STOP": {

            }
                break;
            case "RESET": {
                context.set_mechanical_time(0);
                context.set_mechanical_tankLevel(0);
                context.set_mechanical_dataTime([]);
                context.set_mechanical_dataTankLevel([]);
                context.set_mechanical_dataReferenceLevel([]);
                context.set_mechanical_dataError([]);
                console.log("RESET");
            }
                break;
        }
    }, [context.mechanical_operate]);

    useEffect(() => {
        if(context.mechanical_time % 1 === 0){
            context.set_mechanical_dataTime([...context.mechanical_dataTime, context.mechanical_time]);
            context.set_mechanical_dataTankLevel([...context.mechanical_dataTankLevel, context.mechanical_tankLevel]);
            context.set_mechanical_dataReferenceLevel([...context.mechanical_dataReferenceLevel, context.manualController.parameters.referenceHeight]);
            let error = Math.abs(context.manualController.parameters.referenceHeight - context.mechanical_tankLevel);
            let oldError = context.mechanical_dataError[context.mechanical_dataError.length - 1];
            if (oldError === undefined || NaN) oldError = 0;
            context.set_mechanical_dataError([...context.mechanical_dataError, oldError + error]);
        }
    }, [context.mechanical_time])


    return (

        <div style={{
            marginTop: "6px",
            marginLeft: "40px",
            height: "700px",
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
            <DisplayVarEval top={705} left={600} value={config.parameters.evaluationMechanical.referenceLevel} unit={"m"}
                            name={"Reference"} decimal={5}/>
            <DisplayVar top={210} left={290} value={context.mechanical_tankFlowInp} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
            <DisplayVar top={595} left={290} value={context.mechanical_tankFlowOut} unit={"m³/s"} name={"Flow"}
                        decimal={5}/>
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
            <Canvas p1={context.p1} level={context.mechanical_tankLevel}/>

            <Row className={"d-flex justify-content-center"} style={{paddingTop: "94px"}}>
                <Operate state={context.mechanical_operate} stateReport={context.set_mechanical_operate}/>
            </Row>

            <Chart data={{
                time: context.mechanical_dataTime,
                level: context.mechanical_dataTankLevel,
                reference: context.mechanical_dataReferenceLevel,
                error: context.mechanical_dataError
            }}/>


        </div>


    )
}

export default MechanicalControl;