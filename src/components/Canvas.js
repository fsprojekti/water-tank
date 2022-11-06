import React, {useContext, useEffect, useRef} from 'react'
import {AppContext} from "../context/contex";

const Canvas = props => {

    const context = useContext(AppContext);

    const canvasRef = useRef(null)

    useEffect(() => {
        draw();
    }, [])

    //Draw pontoon
    useEffect(() => {
        draw();

    }, [props.tankLevel, context.platoonRodLengthPx, context.pointSwingPx])

    let draw = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //Redefine names
        let A=[197,117];
        let B=[0,0];
        let C=context.pointSwingPx;
        let D;
        let E=context.pointPlatoonPx;
        let l1=100;
        let l2=context.mechanicalParameters.swingRodLengthPx*(1-context.valueSwing);
        let l3=context.mechanicalParameters.swingRodLengthPx*context.valueSwing;
        let l4=context.platoonRodLengthPx;

        D = clcSwingPlatoonJointPoint(C,E,l3, l4);

        let alpha = Math.atan((C[1]-D[1])/(C[0]-D[0]));
        // console.log("alpha: "+alpha*180/Math.PI);
        // console.log("x: "+(l2*Math.cos(alpha)))
        // console.log("y: "+(l2*Math.sin(alpha)))
        B=[C[0]-l2*Math.cos(alpha),C[1]-l2*Math.sin(alpha)];

        let l6=Math.abs(A[0]-B[0]);
        let l5 = Math.sqrt(l1*l1 - l6*l6 );
        A[1]=B[1]+l5;
        context.set_pointValveInpPx(A);

        //Draw point A
        ctx.beginPath();
        ctx.arc(A[0], A[1], 15, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(52, 58, 64)";
        ctx.fill();

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
    console.log(beta*180/Math.PI);
    let beta_2 = Math.acos((lengthPlatoonRod*lengthPlatoonRod + c*c - lengthSwingRod*lengthSwingRod) / (2 * lengthPlatoonRod * c));
    console.log(beta_2*180/Math.PI);
    let beta_3 = beta+beta_2;
    console.log(beta_3*180/Math.PI);
    let e = lengthPlatoonRod* Math.sin(beta_3);
    let f = Math.sqrt(lengthPlatoonRod*lengthPlatoonRod - e*e);
    if(beta_3>Math.PI/2){
        return [platoonPoint[0]+f,platoonPoint[1]-e];
    }
    return [platoonPoint[0]-f,platoonPoint[1]-e];
}