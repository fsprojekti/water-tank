import React, {useEffect, useRef} from 'react'

const Canvas = props => {

    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        //Our first draw
        ctx.beginPath();
        ctx.arc(props.p1[0], props.p1[1], 20, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(28,102,147)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(props.p1[0], props.p1[1], 10, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(66,131,178)";
        ctx.fill();
    }, [])

    //Draw pontoon
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        ctx.roundRect(800, 577 - (parseFloat(props.tankLevel) * 350), 250, 50, 5);
        ctx.fillStyle = "rgb(213,68,54)";
        ctx.fill();
        ctx.strokeStyle = "rgb(176, 58, 46)";
        ctx.lineWidth = 2;
        ctx.stroke();

    }, [props.tankLevel])

    return <canvas ref={canvasRef} {...props} width="1400" height="630"/>
}

export default Canvas