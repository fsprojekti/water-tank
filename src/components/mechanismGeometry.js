import config from "../config";
import {beltRatio} from "../simulation/controller";

const {tank, render, pontoon, intake, controller} = config;

//Rack and pinion controller on the scheme [Px]; the pinion is drawn to scale so it rolls on the rack teeth
const pinionRadius = controller.pinionRadiusM * render.m2Px;
const pinionX = pontoon.axisXPx + 6 + pinionRadius;

export const rackGeometry = {
    rackWidth: 12,
    rackLength: 470,
    toothStep: 11,
    pinionRadius,
    pinionX,
    //Pinion sits this far above the pontoon top when the level is at h0
    pinionAbovePontoon: 140,
    //Lead screw of the carriage right of the pontoon: x, fixed top bracket, lower end
    screwX: pontoon.axisXPx + pontoon.widthPx / 2 + 20,
    screwTop: 26,
    screwBottom: 440,
    //Pulley on the intake valve stem above the valve
    valvePulley: [intake.valveXPx, 108],
    //Belt pulleys at ratio 1 : 1
    pulleyPx: 14,
};

//Pontoon top [Px] for a level [m]
export const pontoonTopPx = (level) => tank.offsetPx - level * render.m2Px - pontoon.heightPx;

//Pinion axle y [Px] on the carriage, set by the closing level h0 [m]
export const pinionY = (h0) => pontoonTopPx(h0) - rackGeometry.pinionAbovePontoon;

/**
 * Pulley radii [Px] for a belt ratio (driving : driven turns), both changing so neither gets absurdly big or small.
 * A belt ratio r turns the driven pulley r times as far as the driving one.
 */
export const beltPulleys = (ratio) => ({
    driving: rackGeometry.pulleyPx * Math.sqrt(ratio),
    driven: rackGeometry.pulleyPx / Math.sqrt(ratio),
});

//Pinion and valve pulleys for gain kp
export const controllerPulleys = (kp) => beltPulleys(beltRatio(kp));
