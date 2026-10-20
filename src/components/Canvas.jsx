import {useEffect, useRef} from "react";
import config from "../config";
import {computeLinkage} from "../simulation/linkage";

const color = "rgb(52, 58, 64)";

//Fixed pivot symbol: triangle under the joint standing on a hatched ground line
const drawFixedSupport = (ctx, [x, y]) => {
    const half = 26;
    const height = 42;
    const base = y + height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - half, base);
    ctx.lineTo(x + half, base);
    ctx.closePath();
    ctx.fillStyle = "rgb(173, 181, 189)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - half - 12, base);
    ctx.lineTo(x + half + 12, base);
    for (let hx = x - half - 8; hx <= x + half + 12; hx += 10) {
        ctx.moveTo(hx, base);
        ctx.lineTo(hx - 8, base + 10);
    }
    ctx.lineWidth = 2;
    ctx.stroke();
};

//Draws pontoon and mechanical controller linkage
const Canvas = ({level, l3, l4}) => {
    const canvasRef = useRef(null);
    const {width, height} = config.render.canvas;

    useEffect(() => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, width, height);

        const {surfacePx, points} = computeLinkage(level, l3, l4);
        const {pontoon} = config;

        //Pontoon hangs on or is pushed by the rods when they can't follow the surface
        const pontoonTop = points ? points.E[1] : surfacePx - pontoon.heightPx;
        ctx.beginPath();
        ctx.roundRect(pontoon.axisXPx - pontoon.widthPx / 2, pontoonTop, pontoon.widthPx, pontoon.heightPx, 5);
        ctx.fillStyle = "rgb(213,68,54)";
        ctx.fill();

        drawFixedSupport(ctx, config.controller.swingPointPx);

        if (!points) return;
        const joints = [points.A, points.B, points.C, points.D, points.E];

        ctx.fillStyle = color;
        joints.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, 2 * Math.PI);
            ctx.fill();
        });

        ctx.beginPath();
        joints.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        //Governor stem from A down to the intake valve
        ctx.moveTo(...points.A);
        ctx.lineTo(points.A[0], config.intake.valveYPx);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.stroke();
    }, [level, l3, l4, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{position: "absolute", top: 0, left: 0}}/>;
};

export default Canvas;
