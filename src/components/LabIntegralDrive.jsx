import config from "../config";
import {labMechanics} from "../labConfig";
import {integralClosingLevel, integralDriveGain, labControl} from "../simulation/labController";
import IntegralDrive from "./IntegralDrive";
import RackDrive from "./RackDrive";

//Use the same physical pilot valve and turbine for both modes.
//I drives the intake axle directly; PI moves the P linkage's carriage.
const LabIntegralDrive = ({model}) => {
    const controller = config.evaluation[model.mode].controller;
    const pi = controller === "parallelPI";
    const opening = labControl(model, controller).command;
    const h0 = pi ? integralClosingLevel(model) : undefined;
    return <>
        {pi && <RackDrive level={model.level} kp={model.kp} h0={h0} opening={opening * 100} crank={false}/>}
        <IntegralDrive level={model.level} h0={h0} reference={model.referenceLevel}
            pitch={labMechanics.screwPitch} gain={integralDriveGain(model, controller)}
            unitGain={pi ? labMechanics.carriageUnitGain : labMechanics.valveUnitGain}
            directOpening={pi ? undefined : opening} deadband={0}
            label={pi ? "Mehanski PI-regulator: turbina premika voziček P-mehanizma"
                : "Mehanski I-regulator: turbina neposredno poganja dovodni ventil"}/>
    </>;
};

export default LabIntegralDrive;
