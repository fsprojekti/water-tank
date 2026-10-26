import config from "../config";
import colors from "./pipeColors";
import {BeltSpans, Pulley} from "./mechanismParts";
import {beltPulleys, pontoonTopPx, rackGeometry} from "./mechanismGeometry";
import {valveDriveRatio} from "../simulation/controller";

const hoseIdle = "#9aa5b1";

//Pilot valve inside the tank, right of the pontoon; turbine above it [Px]
const pilot = {x: 1096, width: 34, halfHeight: 22, travel: 16, portB: 1106, portA: 1120};
const turbine = {x: 1030, y: 74, radius: 42, standFoot: [1030, 0]};
const supplyFromPx = 1468;
//Pulley on top of the carriage lead screw [Px]
const screwPulleyY = rackGeometry.screwTop + 22;
//Level error with both pilot ports closed [m]
const deadbandM = 0.002;

//Pelton wheel: cups around a disc
const TurbineWheel = ({angle}) => {
    const {x, y, radius} = turbine;
    return (
        <g transform={`rotate(${angle * 180 / Math.PI} ${x} ${y})`}>
            <circle cx={x} cy={y} r={radius - 8} fill={colors.pipe} stroke={colors.pipeDark} strokeWidth={2}/>
            {Array.from({length: 12}, (_, i) => {
                const a = i * Math.PI / 6;
                const cx = x + Math.cos(a) * (radius - 6);
                const cy = y + Math.sin(a) * (radius - 6);
                return (
                    <ellipse key={i} cx={cx} cy={cy} rx={8} ry={5} fill={colors.pipeDark}
                             transform={`rotate(${a * 180 / Math.PI + 90} ${cx} ${cy})`}/>
                );
            })}
        </g>
    );
};

//Hose; active hoses carry water (animated)
const Hose = ({points, active}) => {
    const d = points.map(([x, y]) => `${x},${y}`).join(" ");
    return (
        <>
            <polyline points={d} fill={"none"} stroke={active ? colors.pipeDark : hoseIdle} strokeWidth={6}
                      strokeLinejoin={"round"}/>
            {active && <polyline className={"hose-flow"} points={d} fill={"none"} stroke={colors.water} strokeWidth={3}
                                 strokeLinejoin={"round"}/>}
        </>
    );
};

//Nozzles right of the wheel, jets aimed left at the cups
const nozzleX = turbine.x + turbine.radius + 8;
const Nozzle = ({y}) => (
    <polygon points={`${nozzleX + 10},${y - 6} ${nozzleX},${y - 3} ${nozzleX},${y + 3} ${nozzleX + 10},${y + 6}`}
             fill={colors.metal}/>
);
const Jet = ({y}) => (
    <line className={"hose-flow"} x1={nozzleX} y1={y} x2={turbine.x + 6} y2={y}
          stroke={colors.water} strokeWidth={5} strokeLinecap={"round"}/>
);

/**
 * Integral action: the pontoon moves the spool of a pilot valve fixed at the reference. Level too low opens port A,
 * too high port B; the jet turns a Pelton wheel one way or the other. An elastic belt turns the carriage lead screw,
 * which raises or lowers the carriage, i.e. the closing level h0. The pulley sizes show the belt ratio that sets Ki;
 * the wheel and screw angles follow h0 (screw pitch [m per turn]).
 */
const IntegralDrive = ({level, h0, reference, pitch, gain, unitGain, directOpening, deadband = deadbandM,
    label = "Pilotni ventil in turbina"}) => {
    const {pontoon, render, tank} = config;
    const direct = directOpening !== undefined;

    //Pilot valve sits where the pontoon middle is when the level equals the reference
    const pilotY = tank.offsetPx - reference * render.m2Px - pontoon.heightPx / 2;
    const pontoonMiddle = pontoonTopPx(level) + pontoon.heightPx / 2;
    const spool = Math.max(-pilot.travel, Math.min(pilot.travel, pontoonMiddle - pilotY));
    const error = reference - level;
    //Direct valve opening is counterclockwise; reverse the nozzle connections for that drive.
    const portA = direct ? error < -deadband : error > deadband;
    const portB = direct ? error > deadband : error < -deadband;

    //The screw turns with the carriage height, the wheel by the belt ratio
    const pulleys = beltPulleys(gain / unitGain);
    //Scale both radii together: retain the transmission ratio without overlapping mounts at extreme gains.
    const scale = Math.min(1, (direct ? 34 : 30) / Math.max(pulleys.driving, pulleys.driven));
    pulleys.driving *= scale;
    pulleys.driven *= scale;
    const outputAngle = direct ? -directOpening * Math.PI / 2 / valveDriveRatio() : h0 / pitch * 2 * Math.PI;
    const wheelAngle = outputAngle * pulleys.driven / pulleys.driving;

    const valveTop = pilotY - pilot.halfHeight;
    //Jet on the lower cups turns the wheel one way, on the upper cups the other way
    const nozzleA = turbine.y + turbine.radius - 10;
    const nozzleB = turbine.y - turbine.radius + 10;
    const hoseEnd = nozzleX + 10;
    const pontoonRight = pontoon.axisXPx + pontoon.widthPx / 2;
    const output = direct ? {x: rackGeometry.valvePulley[0], y: rackGeometry.valvePulley[1]}
        : {x: rackGeometry.screwX, y: screwPulleyY};

    return (
        <svg width={1500} height={700} role="img" aria-label={label}
             style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
            {direct && <rect x={pontoon.axisXPx - pontoon.widthPx / 2} y={pontoonTopPx(level)}
                width={pontoon.widthPx} height={pontoon.heightPx} rx={5} fill="rgb(213, 68, 54)"/>}
            {/*Pontoon arm to the pilot valve spool*/}
            <polyline points={`${pontoonRight},${pontoonMiddle} ${pilot.x - 8},${pontoonMiddle} ` +
                `${pilot.x - 8},${pilotY + spool} ${pilot.x},${pilotY + spool}`}
                      fill={"none"} stroke={colors.metal} strokeWidth={4} strokeLinejoin={"round"}/>

            {/*Supply through the tank wall into the pilot valve*/}
            <line x1={supplyFromPx} y1={pilotY} x2={pilot.x + pilot.width} y2={pilotY} stroke={colors.pipeDark}
                  strokeWidth={7}/>
            <text x={supplyFromPx - 2} y={pilotY - 8} textAnchor={"end"} fontSize={13} fill={colors.metal}>supply</text>

            {/*Hoses up to the nozzles: A turns the wheel one way, B the other*/}
            <Hose active={portB} points={[[pilot.portB, valveTop], [pilot.portB, nozzleB], [hoseEnd, nozzleB]]}/>
            <Hose active={portA} points={[[pilot.portA, valveTop], [pilot.portA, nozzleA], [hoseEnd, nozzleA]]}/>
            <Nozzle y={nozzleA}/>
            <Nozzle y={nozzleB}/>

            {/*Pilot valve body with ports and spool*/}
            <rect x={pilot.x} y={pilotY - pilot.halfHeight} width={pilot.width} height={2 * pilot.halfHeight} rx={4}
                  fill={colors.steel} stroke={colors.metal} strokeWidth={2}/>
            <rect x={pilot.x + 4} y={pilotY + spool - 5} width={pilot.width - 8} height={10} rx={2} fill={colors.metal}/>
            <text x={pilot.portB - 9} y={valveTop - 6} textAnchor={"middle"} fontSize={13} fill={colors.metal}>B</text>
            <text x={pilot.portA + 9} y={valveTop - 6} textAnchor={"middle"} fontSize={13} fill={colors.metal}>A</text>

            {/*Turbine hanging from the top, jets from the active nozzle*/}
            <line x1={turbine.standFoot[0]} y1={turbine.standFoot[1]} x2={turbine.x} y2={turbine.y} stroke={colors.metal}
                  strokeWidth={6}/>
            <TurbineWheel angle={wheelAngle}/>
            {portA && <Jet y={nozzleA}/>}
            {portB && <Jet y={nozzleB}/>}

            {/*Turbine drives either the carriage screw (PI) or the intake pulley directly (I only).*/}
            <BeltSpans a={{x: turbine.x, y: turbine.y, r: pulleys.driving}} b={{...output, r: pulleys.driven}}/>
            <Pulley x={turbine.x} y={turbine.y} r={pulleys.driving} angle={wheelAngle}/>
            {direct && <>
                <BeltSpans a={{...output, r: rackGeometry.valveDriveRadius}}
                    b={{x: config.intake.valveXPx, y: config.intake.valveYPx, r: rackGeometry.valveDrivenRadius}}/>
                <Pulley x={output.x} y={output.y} r={rackGeometry.valveDriveRadius} angle={outputAngle}/>
                <text x={output.x + rackGeometry.valveDrivenRadius + 8} y={(output.y + config.intake.valveYPx) / 2}
                    fontSize={12} fill={colors.pipeDark}>2 : 1 (fixed)</text>
            </>}
            <Pulley x={output.x} y={output.y} r={pulleys.driven} angle={outputAngle}/>
        </svg>
    );
};

export default IntegralDrive;
