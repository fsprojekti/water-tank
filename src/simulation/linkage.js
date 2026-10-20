import config from "../config";
import {clamp} from "./model";

const isPoint = (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

//Joint D between swing rod (from swing point C) and pontoon rod (from pontoon E)
const jointPoint = (swingPoint, pontoonPoint, swingRod, pontoonRod) => {
    const a = Math.abs(pontoonPoint[1] - swingPoint[1]);
    const b = Math.abs(pontoonPoint[0] - swingPoint[0]);
    const c = Math.sqrt(a * a + b * b);
    const beta = Math.asin(a / c);
    const beta2 = Math.acos(clamp((pontoonRod * pontoonRod + c * c - swingRod * swingRod) / (2 * pontoonRod * c), -1, 1));
    const beta3 = beta + beta2;
    const e = pontoonRod * Math.sin(beta3);
    const f = Math.sqrt(pontoonRod * pontoonRod - e * e);
    const point = beta3 > Math.PI / 2
        ? [pontoonPoint[0] + f, pontoonPoint[1] - e]
        : [pontoonPoint[0] - f, pontoonPoint[1] - e];
    return isPoint(point) ? point : null;
};

/**
 * Vertical range of the pontoon top on its axis [Px] reachable by rods l3, l4 [Px] from swing point C,
 * or null when the rods can't reach the axis at all.
 */
const pontoonRange = (C, l3, l4) => {
    const dx = Math.abs(config.pontoon.axisXPx - C[0]);
    const vertical = (distance) => Math.sqrt(Math.max(distance * distance - dx * dx, 0));
    if (l3 + l4 < dx) return null;
    return [C[1] + vertical(Math.abs(l3 - l4)), C[1] + vertical(l3 + l4)];
};

/**
 * Geometry of the mechanical controller for given tank level and rod lengths [m].
 * The pontoon floats on the surface unless the rods hold it above the water (fully stretched)
 * or push it under (fully folded).
 * Returns water surface [Px] and joints A–E [Px], or points=null when the mechanism can't be assembled.
 */
export const computeLinkage = (level, l3, l4) => {
    const {controller, pontoon, render} = config;
    const m2Px = render.m2Px;
    const l3Px = l3 * m2Px;
    const l4Px = l4 * m2Px;

    const surfacePx = render.canvas.height - level * m2Px;
    const C = controller.swingPointPx;
    const range = pontoonRange(C, l3Px, l4Px);
    if (!range) return {surfacePx, points: null};
    const E = [pontoon.axisXPx, clamp(surfacePx - pontoon.heightPx, range[0], range[1])];

    const D = jointPoint(C, E, l3Px, l4Px);
    if (!D) return {surfacePx, points: null};

    const alpha = Math.atan((C[1] - D[1]) / (C[0] - D[0]));
    const l2Px = controller.l2 * m2Px;
    const B = [C[0] - l2Px * Math.cos(alpha), C[1] - l2Px * Math.sin(alpha)];

    const l1Px = controller.l1 * m2Px;
    const l6 = Math.abs(controller.governorAxisXPx - B[0]);
    const A = [controller.governorAxisXPx, B[1] + Math.sqrt(l1Px * l1Px - l6 * l6)];
    if (!isPoint(A) || !isPoint(B)) return {surfacePx, points: null};

    return {surfacePx, points: {A, B, C, D, E}};
};

//Intake valve opening [%] for governor y position [Px]
export const governorValvePosition = (governorYPx) => {
    const {governorClosedPx, governorOpenPx} = config.controller;
    return clamp((governorClosedPx - governorYPx) / (governorClosedPx - governorOpenPx) * 100, 0, 100);
};

//Intake valve opening [%]; closed when the linkage can't be assembled
export const mechanicalIntakePosition = (level, l3, l4) => {
    const {points} = computeLinkage(level, l3, l4);
    return points ? governorValvePosition(points.A[1]) : 0;
};
