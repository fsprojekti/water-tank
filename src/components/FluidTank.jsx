import tank, {innerWidthPx} from "./tankGeometry";
import {intakeOutletLeftPx, intakeOutletTopPx} from "./intakeGeometry";

//Max flow animation width [Px]
const flowMaxPx = 43;

//Scheme geometry [Px]: overflow lip runs from just inside the right wall top out past the wall,
//where the overflow stream falls
const overflow = {lipLeftPx: tank.innerRightPx - 8, lipEndPx: 1440, streamLeftPx: 1410};
const intake = {leftPx: intakeOutletLeftPx, topPx: intakeOutletTopPx};
const bubbleDepthPx = 90;

//Bubbles rising where the intake stream hits the surface: offset from stream [Px], size [Px], duration and delay [s]
const bubbles = [
    {x: -6, size: 6, duration: 1.6, delay: 0},
    {x: 10, size: 4, duration: 1.3, delay: 0.35},
    {x: 24, size: 7, duration: 1.9, delay: 0.65},
    {x: 2, size: 5, duration: 1.45, delay: 0.95},
    {x: 34, size: 4, duration: 1.7, delay: 1.2},
    {x: 16, size: 5, duration: 2.05, delay: 0.2},
];

//Tank water, overflow, intake stream and dashed reference line; level, flow and reference in [%]
const FluidTank = ({level, flow, reference, heightPx, offsetPx}) => {
    const flowPx = Math.min(Math.max(flow / 100 * flowMaxPx, 0), flowMaxPx);
    const levelPx = Math.min(Math.max(level / 100 * heightPx, 0), heightPx);
    const overflowVisibility = levelPx >= heightPx ? "visible" : "hidden";

    return (
        <div>
            <div className={"water-body"} style={{
                position: "absolute",
                top: offsetPx - levelPx,
                left: tank.innerLeftPx,
                width: innerWidthPx,
                height: levelPx,
            }}>
                {/*Bubbles rise in a shallow layer under the surface where the stream lands*/}
                {flowPx > 0 && (
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: Math.min(levelPx, bubbleDepthPx),
                        overflow: "hidden",
                    }}>
                        {bubbles.map((bubble) => (
                            <span key={bubble.delay} className={"bubble"} style={{
                                left: intake.leftPx - tank.innerLeftPx + bubble.x,
                                width: bubble.size,
                                height: bubble.size,
                                animationDuration: `${bubble.duration}s`,
                                animationDelay: `${bubble.delay}s`,
                            }}/>
                        ))}
                    </div>
                )}
            </div>
            {/*Flat water surface highlight*/}
            {levelPx > 0 && (
                <div style={{
                    position: "absolute",
                    top: offsetPx - levelPx,
                    left: tank.innerLeftPx,
                    width: innerWidthPx,
                    height: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.35)",
                }}/>
            )}
            <div className={"water-body"} style={{
                visibility: overflowVisibility,
                position: "absolute",
                top: offsetPx - levelPx,
                left: overflow.lipLeftPx,
                width: overflow.lipEndPx - overflow.lipLeftPx,
                height: 20,
            }}/>
            <div className={"water-stream"} style={{
                visibility: overflowVisibility,
                position: "absolute",
                top: offsetPx - levelPx + 20,
                left: overflow.streamLeftPx,
                width: 30,
                height: heightPx - 10,
            }}/>
            <div className={"water-stream"} style={{
                position: "absolute",
                top: intake.topPx,
                left: intake.leftPx,
                width: flowPx,
                //Stream ends at the water surface
                height: Math.max(offsetPx - levelPx - intake.topPx, 0),
            }}/>
            {reference !== undefined && (
                <div style={{
                    position: "absolute",
                    top: offsetPx - reference / 100 * heightPx - 1,
                    left: tank.innerLeftPx,
                    width: innerWidthPx,
                    borderTop: "3px dashed #fd8000",
                }}/>
            )}
        </div>
    );
};

export default FluidTank;
