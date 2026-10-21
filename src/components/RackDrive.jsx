import config from "../config";
import colors from "./pipeColors";
import {BeltSpans, FixedMount, Gear, Pulley} from "./mechanismParts";
import {controllerPulleys, pinionY, pontoonTopPx, rackGeometry as g} from "./mechanismGeometry";

/**
 * Mechanical P controller: the rack on the pontoon turns the pinion, its pulley drives the pulley on the intake valve
 * stem by an elastic belt. The pinion sits on a carriage on a lead screw; the carriage height is the closing level h0.
 * Pulley sizes show the belt ratio, which sets the gain kp. crank: draw a hand crank on the screw (no turbine).
 */
const RackDrive = ({level, kp, h0, opening, crank = true}) => {
    const {pontoon} = config;
    const top = pontoonTopPx(level);
    const pinion = {x: g.pinionX, y: pinionY(h0)};
    const pulleys = controllerPulleys(kp);
    //The pinion rolls on the rack: its angle follows the rack position relative to the carriage
    const pinionAngle = -(top - pontoonTopPx(h0)) / g.pinionRadius;
    //The valve turns a quarter turn from closed to fully open
    const valveAngle = -opening / 100 * Math.PI / 2;
    const [valveX, valveY] = g.valvePulley;
    const rackLeft = pontoon.axisXPx - g.rackWidth / 2;
    const teeth = [];
    for (let y = top - 6; y > top - g.rackLength; y -= g.toothStep) teeth.push(y);

    return (
        <svg width={1500} height={700} style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
            {/*Lead screw of the carriage hanging from a fixed mount, with a crank on top*/}
            <FixedMount x={g.screwX} y={g.screwTop} width={56}/>
            <line x1={g.screwX} y1={g.screwTop} x2={g.screwX} y2={g.screwBottom} stroke={colors.steel} strokeWidth={8}/>
            {Array.from({length: Math.floor((g.screwBottom - g.screwTop - 20) / 7)}, (_, i) => {
                const y = g.screwTop + 14 + i * 7 + (h0 * 400) % 7;
                return <line key={i} x1={g.screwX - 4} y1={y} x2={g.screwX + 4} y2={y + 3} stroke={"#868e96"} strokeWidth={1.5}/>;
            })}
            {crank && (
                <g>
                    <line x1={g.screwX} y1={g.screwTop + 8} x2={g.screwX + 26} y2={g.screwTop + 8} stroke={colors.metal} strokeWidth={4}/>
                    <line x1={g.screwX + 26} y1={g.screwTop + 8} x2={g.screwX + 26} y2={g.screwTop - 6} stroke={colors.metal}
                          strokeWidth={5} strokeLinecap={"round"}/>
                </g>
            )}

            {/*Rack on the pontoon*/}
            <rect x={rackLeft} y={top - g.rackLength} width={g.rackWidth} height={g.rackLength} fill={colors.steel}
                  stroke={colors.metal} strokeWidth={1.5}/>
            {teeth.map((y) => (
                <polygon key={y} points={`${rackLeft + g.rackWidth},${y - 3} ${rackLeft + g.rackWidth + 5},${y - 1.5} ` +
                    `${rackLeft + g.rackWidth + 5},${y + 1.5} ${rackLeft + g.rackWidth},${y + 3}`} fill={colors.metal}/>
            ))}

            {/*Pontoon*/}
            <rect x={pontoon.axisXPx - pontoon.widthPx / 2} y={top} width={pontoon.widthPx} height={pontoon.heightPx}
                  rx={5} fill={"rgb(213, 68, 54)"}/>

            {/*Carriage: from the screw nut to the pinion axle*/}
            <rect x={pinion.x - 6} y={pinion.y - 9} width={g.screwX - pinion.x + 18} height={18} rx={4} fill={colors.metal}/>
            <rect x={g.screwX - 10} y={pinion.y - 14} width={20} height={28} rx={3} fill={"#495057"}/>

            {/*Belt from the pinion pulley to the valve stem pulley*/}
            <BeltSpans a={{x: pinion.x, y: pinion.y, r: pulleys.driving}} b={{x: valveX, y: valveY, r: pulleys.driven}}/>
            <Gear x={pinion.x} y={pinion.y} r={g.pinionRadius - 4} angle={pinionAngle} teeth={18}/>
            <Pulley x={pinion.x} y={pinion.y} r={pulleys.driving} angle={pinionAngle}/>

            {/*Valve stem from its pulley down to the valve*/}
            <line x1={valveX} y1={valveY} x2={valveX} y2={config.intake.valveYPx} stroke={colors.metal} strokeWidth={5}/>
            <Pulley x={valveX} y={valveY} r={pulleys.driven} angle={valveAngle}/>
            <text x={valveX + pulleys.driven + 6} y={valveY + 4} fontSize={12} fill={colors.pipeDark}>valve</text>
        </svg>
    );
};

export default RackDrive;
