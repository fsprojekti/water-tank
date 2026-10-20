import config from "../config";

//Tank on the scheme [Px]
const tankGeometry = {
    innerLeftPx: 465,
    innerRightPx: 1388,
    wallPx: 11,
    bottomPx: config.tank.offsetPx,
    leftWallTopPx: 161,
    rightWallTopPx: 289,
    //Intake pipe crosses the left wall here
    pipeGapPx: [194, 237],
};

export const innerWidthPx = tankGeometry.innerRightPx - tankGeometry.innerLeftPx;

export default tankGeometry;
