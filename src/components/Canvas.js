import React, {useContext, useEffect, useRef} from 'react'
import {AppContext} from "../context/contex";
import config from "../config";

const Canvas = props => {

    const context = useContext(AppContext);

    const canvasRef = useRef(null)

    useEffect(() => {
        draw();
    }, [])

    //Draw pontoon
    useEffect(() => {
        draw();

    }, [props.coordinateYPlatoonPx, context.l3, context.l4, context.mechanical_tankLevel])

    let draw = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let level = config.parameters.render.canvas.height - props.level * config.parameters.render.m2Px

        //Draw pontoon
        ctx.beginPath();
        ctx.roundRect(
            config.parameters.pontoon.axisXPx - 125,
            level - config.parameters.pontoon.heightPx,
            250,
            config.parameters.pontoon.heightPx,
            5
        );
        ctx.fillStyle = "rgb(213,68,54)";
        ctx.fill();

        //Redefine names
        let A = [config.parameters.controller.axisYGovernorPositionPx, 110];
        let B = [0, 0];
        let C = config.parameters.controller.swingPointPx;
        let D;
        let E = [config.parameters.pontoon.axisXPx, level - config.parameters.pontoon.heightPx];

        let l1Px = config.parameters.controller.l1 * config.parameters.render.m2Px;
        let l2Px = config.parameters.controller.l2 * config.parameters.render.m2Px;
        let l3 = context.l3*config.parameters.render.m2Px;
        let l4 = context.l4*config.parameters.render.m2Px;

        D = clcSwingPlatoonJointPoint(C, E, l3, l4);
        let alpha = Math.atan((C[1] - D[1]) / (C[0] - D[0]));
        B = [C[0] - l2Px * Math.cos(alpha), C[1] - l2Px * Math.sin(alpha)];

        let l6 = Math.abs(A[0] - B[0]);
        let l5 = Math.sqrt(l1Px * l1Px - l6 * l6);
        A[1] = B[1] + l5;

        //Draw point A
        ctx.beginPath();
        ctx.arc(A[0], A[1], 15, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(52, 58, 64)";
        ctx.fill();
        context.set_governorPositionPx(A[1]);

        //Draw point B
        ctx.beginPath();
        ctx.arc(B[0], B[1], 15, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(52, 58, 64)";
        ctx.fill();

        //Draw point C
        ctx.beginPath();
        ctx.arc(C[0], C[1], 15, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(52, 58, 64)";
        ctx.fill();

        //Draw point D
        ctx.beginPath();
        ctx.arc(D[0], D[1], 15, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(52, 58, 64)";
        ctx.fill();

        //Draw point E
        ctx.beginPath();
        ctx.arc(E[0], E[1], 15, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(52, 58, 64)";
        ctx.fill();

        //Draw line ABCDE
        ctx.beginPath();
        ctx.moveTo(A[0], A[1]);
        ctx.lineTo(B[0], B[1]);
        ctx.lineTo(C[0], C[1]);
        ctx.lineTo(D[0], D[1]);
        ctx.lineTo(E[0], E[1]);
        ctx.strokeStyle = "rgb(52, 58, 64)";
        ctx.lineWidth = 5;
        ctx.stroke();


    }

    return <canvas ref={canvasRef} {...props} width="1400" height="630"/>
}

export default Canvas

let clcSwingPlatoonJointPoint = (swingPoint, platoonPoint, lengthSwingRod, lengthPlatoonRod) => {
    let a = Math.abs(platoonPoint[1] - swingPoint[1]);
    let b = Math.abs(platoonPoint[0] - swingPoint[0]);
    let c = Math.sqrt(a * a + b * b);
    let beta = Math.asin(a / c);
    let beta_2 = Math.acos((lengthPlatoonRod * lengthPlatoonRod + c * c - lengthSwingRod * lengthSwingRod) / (2 * lengthPlatoonRod * c));
    let beta_3 = beta + beta_2;
    let e = lengthPlatoonRod * Math.sin(beta_3);
    let f = Math.sqrt(lengthPlatoonRod * lengthPlatoonRod - e * e);
    if (beta_3 > Math.PI / 2) {
        return [platoonPoint[0] + f, platoonPoint[1] - e];
    }
    return [platoonPoint[0] - f, platoonPoint[1] - e];
}