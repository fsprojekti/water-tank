import config from "../config";
import {computeLinkage} from "../simulation/linkage";
import colors from "./pipeColors";

const metal = "rgb(52, 58, 64)";
const steel = "#adb5bd";
const belt = "#6d4c41";
const hoseIdle = "#9aa5b1";

//Fixed parts at the right tank wall [Px]
const pilot = {x: 1296, width: 34, halfHeight: 22, travel: 16, portB: 1306, portA: 1320};
const turbine = {x: 1402, y: 128, radius: 42, standFoot: [1394, 289]};
//Belt pulleys at ratio 1 : 1 [Px]
const pulleyPx = 14;
const supplyFromPx = 1468;
//Nut in the hub of the rod pulley: distance above the pontoon joint [Px];
//thread from the hub down towards the pontoon, length [Px] and spacing, the same for any pulley size
const nut = {fromE: 78, threadPx: 62, threadStep: 6};
//Level error with both pilot ports closed [m]
const deadbandM = 0.002;

const unit = ([x, y]) => {
    const length = Math.hypot(x, y);
    return [x / length, y / length];
};

//Elastic belt between two pulleys: the straight spans on both sides
const beltSpans = (a, b) => {
    const [nx, ny] = unit([b.y - a.y, a.x - b.x]);
    return [1, -1].map((side) => [
        a.x + side * nx * a.r, a.y + side * ny * a.r, b.x + side * nx * b.r, b.y + side * ny * b.r,
    ]);
};

//Pulley with spokes turned by angle [rad]
const Pulley = ({x, y, r, angle}) => (
    <g transform={`rotate(${angle * 180 / Math.PI} ${x} ${y})`}>
        <circle cx={x} cy={y} r={r} fill={steel} stroke={belt} strokeWidth={3}/>
        {[0, 1, 2].map((i) => {
            const a = i * 2 * Math.PI / 3;
            return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * r} y2={y + Math.sin(a) * r}
                         stroke={metal} strokeWidth={2}/>;
        })}
        <circle cx={x} cy={y} r={3} fill={metal}/>
    </g>
);

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

//Water jet from a nozzle onto the wheel
const Jet = ({y}) => (
    <line className={"hose-flow"} x1={turbine.x - turbine.radius - 8} y1={y} x2={turbine.x - 6} y2={y}
          stroke={colors.water} strokeWidth={5} strokeLinecap={"round"}/>
);

//Nozzle at the end of a hose, aimed at the wheel
const Nozzle = ({y}) => (
    <polygon points={`${turbine.x - turbine.radius - 18},${y - 6} ${turbine.x - turbine.radius - 8},${y - 3} ` +
        `${turbine.x - turbine.radius - 8},${y + 3} ${turbine.x - turbine.radius - 18},${y + 6}`} fill={metal}/>
);

/**
 * Integral action of the mechanical controller: the pontoon moves the spool of a pilot valve fixed at the reference.
 * Level too low opens port A, too high port B; the jet turns a Pelton wheel one way or the other. An elastic belt
 * turns the nut on the threaded lower part of the vertical rod, which shortens or lengthens the rod.
 * The wheel and nut angles follow the rod length (screw pitch [m per turn]).
 * The belt ratio sets Ki: ratio = gain / unitGain, shown by the pulley sizes.
 */
const IntegralDrive = ({level, l3, l4, reference, pitch, gain, unitGain}) => {
    const {points} = computeLinkage(level, l3, l4);
    if (!points) return null;
    const {D, E} = points;
    const {pontoon, render, tank} = config;

    //Pilot valve sits where the pontoon middle is when the level equals the reference
    const pilotY = tank.offsetPx - reference * render.m2Px - pontoon.heightPx / 2;
    const pontoonMiddle = E[1] + pontoon.heightPx / 2;
    const spool = Math.max(-pilot.travel, Math.min(pilot.travel, pontoonMiddle - pilotY));
    const error = reference - level;
    const portA = error > deadbandM;
    const portB = error < -deadbandM;

    //Nut on the rod, the threaded part runs from the nut down to the pontoon
    const [ux, uy] = unit([D[0] - E[0], D[1] - E[1]]);
    //Both pulleys change so neither gets absurdly big or small: r_turbine / r_nut = gain / unitGain
    const ratio = Math.sqrt(gain / unitGain);
    const turbinePulley = pulleyPx * ratio;
    const nutAt = {x: E[0] + ux * nut.fromE, y: E[1] + uy * nut.fromE, r: pulleyPx / ratio};
    const turns = l4 / pitch;
    const angle = turns * 2 * Math.PI;
    const phase = (turns % 1) * nut.threadStep;
    const threads = [];
    for (let s = phase; s < nut.threadPx; s += nut.threadStep) {
        const cx = nutAt.x - ux * s;
        const cy = nutAt.y - uy * s;
        threads.push([cx - uy * 6, cy + ux * 6, cx + uy * 6, cy - ux * 6]);
    }

    const valveTop = pilotY - pilot.halfHeight;
    //Jet on the lower cups turns the wheel one way, on the upper cups the other way
    const nozzleA = turbine.y + turbine.radius - 10;
    const nozzleB = turbine.y - turbine.radius + 10;
    const hoseEnd = turbine.x - turbine.radius - 18;
    const pontoonRight = pontoon.axisXPx + pontoon.widthPx / 2;

    return (
        <svg width={1500} height={700} style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
            {/*Threaded lower part of the vertical rod*/}
            {threads.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={steel} strokeWidth={2}/>
            ))}

            {/*Pontoon arm to the pilot valve spool*/}
            <polyline points={`${pontoonRight},${pontoonMiddle} ${pilot.x - 8},${pontoonMiddle} ` +
                `${pilot.x - 8},${pilotY + spool} ${pilot.x},${pilotY + spool}`}
                      fill={"none"} stroke={metal} strokeWidth={4} strokeLinejoin={"round"}/>

            {/*Supply through the tank wall into the pilot valve*/}
            <line x1={supplyFromPx} y1={pilotY} x2={pilot.x + pilot.width} y2={pilotY} stroke={colors.pipeDark}
                  strokeWidth={7}/>
            <text x={supplyFromPx - 2} y={pilotY - 8} textAnchor={"end"} fontSize={13} fill={metal}>supply</text>

            {/*Hoses over the wall to the nozzles: A turns the wheel one way, B the other*/}
            <Hose active={portB} points={[[pilot.portB, valveTop], [pilot.portB, nozzleB], [hoseEnd, nozzleB]]}/>
            <Hose active={portA} points={[[pilot.portA, valveTop], [pilot.portA, nozzleA], [hoseEnd, nozzleA]]}/>
            <Nozzle y={nozzleA}/>
            <Nozzle y={nozzleB}/>

            {/*Pilot valve body with ports and spool*/}
            <rect x={pilot.x} y={pilotY - pilot.halfHeight} width={pilot.width} height={2 * pilot.halfHeight} rx={4}
                  fill={steel} stroke={metal} strokeWidth={2}/>
            <rect x={pilot.x + 4} y={pilotY + spool - 5} width={pilot.width - 8} height={10} rx={2} fill={metal}/>
            <text x={pilot.portB - 9} y={valveTop - 6} textAnchor={"middle"} fontSize={13} fill={metal}>B</text>
            <text x={pilot.portA + 9} y={valveTop - 6} textAnchor={"middle"} fontSize={13} fill={metal}>A</text>

            {/*Turbine on a bracket on the wall top, jets from the active nozzle*/}
            <line x1={turbine.standFoot[0]} y1={turbine.standFoot[1]} x2={turbine.x} y2={turbine.y} stroke={metal}
                  strokeWidth={6}/>
            <TurbineWheel angle={angle * nutAt.r / turbinePulley}/>
            {portA && <Jet y={nozzleA}/>}
            {portB && <Jet y={nozzleB}/>}

            {/*Elastic belt from the turbine pulley to the nut*/}
            {beltSpans({x: turbine.x, y: turbine.y, r: turbinePulley}, nutAt).map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={belt} strokeWidth={4}/>
            ))}
            <Pulley x={turbine.x} y={turbine.y} r={turbinePulley} angle={angle * nutAt.r / turbinePulley}/>
            {/*Nut with its pulley on the rod*/}
            <Pulley x={nutAt.x} y={nutAt.y} r={nutAt.r} angle={angle}/>
        </svg>
    );
};

export default IntegralDrive;
