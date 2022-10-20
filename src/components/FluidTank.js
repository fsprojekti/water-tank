import {useContext, useEffect, useState} from "react";
import {AppContext} from "../context/contex";


const FluidTank = (props) => {
    //Props
    //Width of tank [m]
    const width = 10;
    //Height of tank [m]
    const height = 1;
    //Depth of tank [m]
    const depth = 1;
    //Max volume of tank [m³]
    const volumeMax = width * depth * height;
    //Max level of tank [m]
    const levelMax = height;
    //Max level px
    const levelMaxPx = 350;
    //Max flow animation width px
    const flowMaxPx = 43;
    //Max flow
    const flowMax = 1;
    //Window height
    const bottomLevelPx = 690;

    //Variables
    //Flow [m³/s]
    const [flow, setFlow] = useState(props.flow);
    //Level [% 0...100] of max level
    const [level, setLevel] = useState(0);
    //Current amount of fluid [m³]
    const [fluidAmount, setFluidAmount] = useState(0);
    //Level in px
    const [levelPx, setLevelPx] = useState(0);
    //Flow [m³/s]
    const [flowPx, setFlowPx] = useState(0);

    const [overflow, setOverflow] = useState('hidden');
    useEffect(() => {
        const interval = setInterval(() => {

            let amount = fluidAmount + flow * 0.01;
            setOverflow('hidden');
            //console.log("FluidTank: ",amount, " m³ ",flow, " m³/s");
            if (amount > volumeMax) {
                setOverflow('visible');
                return;
            }
            if (amount < 0) {
                return;
            }
            setFluidAmount(amount)
            setLevel(fluidAmount / (width * depth));
            setLevelPx(level / levelMax * levelMaxPx)

        }, 10);

        return () => clearInterval(interval);
    }, [fluidAmount]);

    useEffect(() => {
        console.log("Flow changed: ", flow);
        setFlowPx(flow / flowMax * flowMaxPx);

    }, [flow])


    return (
        <div>
            <div style={{
                position: "absolute",
                top: bottomLevelPx - levelPx,
                left: 505,
                backgroundColor: "#3aa73f",
                width: 923,
                height: levelPx
            }}>
            </div>
            <div style={{
                visibility: overflow,
                position: "absolute",
                top: bottomLevelPx - levelPx,
                left: 1420,
                backgroundColor: "#3aa73f",
                width: 60,
                height: 20
            }}>
            </div>
            <div style={{
                visibility: overflow,
                position: "absolute",
                top: bottomLevelPx - levelPx + 20,
                left: 1450,
                backgroundColor: "#3aa73f",
                width: 30,
                height: levelMaxPx - 10
            }}>
            </div>
            <div style={{
                position: "absolute",
                top: levelMaxPx - 27,
                left: 590,
                backgroundColor: "#3aa73f",
                width: flowPx,
                height: levelMaxPx + 17
            }}>
            </div>
        </div>
    )
}

export default FluidTank;