import config from "../config";
import {clamp} from "./model";

/**
 * Rack and pinion controller: the rack on the pontoon turns the pinion, a belt turns the intake valve.
 * The valve is closed with the pontoon at h0 [m] and opens in proportion to how far the level is below it;
 * kp [1/m] is the opening per metre, fully open at 1 / kp below h0. Returns the opening [%].
 */
export const proportionalIntakePosition = (level, kp, h0) => clamp(kp * (h0 - level), 0, 1) * 100;

//Fixed valve/input angular ratio; the open belt preserves the rotation direction.
export const valveDriveRatio = () =>
    config.controller.valveDrive.drivingRadiusM / config.controller.valveDrive.drivenRadiusM;

//Adjustable belt ratio: compensate for the fixed reduction so Δh = 1/kp still opens the valve by π/2.
export const beltRatio = (kp) => kp * config.controller.pinionRadiusM * Math.PI / 2 / valveDriveRatio();
