import colors from "./pipeColors";
import {intakeElbowPx, intakePipe as pipe} from "./intakeGeometry";

const outerRadius = pipe.outletPx - pipe.topPx;
const darkRadius = pipe.innerRadius + (pipe.bottomPx - pipe.darkTopPx);

//Quarter ring from the top to the right of the centre, between radii r and R
const quarterRing = (cx, cy, r, R) =>
    `M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx + R} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r} Z`;

//Straight extension of the intake pipe and the elbow down into the tank
const IntakePipe = () => {
    const elbowX = intakeElbowPx;
    return (
        <g>
            <rect x={pipe.endPx - 1} y={pipe.topPx} width={elbowX - pipe.endPx + 1} height={pipe.darkTopPx - pipe.topPx}
                  fill={colors.pipe}/>
            <rect x={pipe.endPx - 1} y={pipe.darkTopPx} width={elbowX - pipe.endPx + 1}
                  height={pipe.bottomPx - pipe.darkTopPx} fill={colors.pipeDark}/>
            <path d={quarterRing(elbowX, pipe.outletPx, darkRadius, outerRadius)} fill={colors.pipe}/>
            <path d={quarterRing(elbowX, pipe.outletPx, pipe.innerRadius, darkRadius)} fill={colors.pipeDark}/>
        </g>
    );
};

export default IntakePipe;
