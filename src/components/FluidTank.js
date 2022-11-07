import {useContext, useEffect, useState} from "react";
import {AppContext} from "../context/contex";

const FluidTank = (props) => {
    //Props
    //Max flow animation width px
    const flowMaxPx = 43;
    //Window height

    //Variables
    //Flow [px]
    let flowPx = props.flow / 100.0 * flowMaxPx;
    //Check if flow is negative and set flow to 0
    if (flowPx < 0) flowPx = 0;
    //Check if flow is bigger than max flow and set flow to max flow
    if (flowPx > flowMaxPx) flowPx = flowMaxPx;


    //Level [px]
    let levelPx = props.level / 100.0 * props.heightPx;
    //Check if level is negative and set level to 0
    if (levelPx < 0) levelPx = 0;
    //Check if level is bigger than max level and set level to max level
    let overflow = "hidden";
    if (levelPx >= props.heightPx) {
        levelPx = props.heightPx;
        overflow = "visible";
    }

    return (
        <div>
            <div style={{
                position: "absolute",
                top: props.offsetPx - levelPx,
                left: 505,
                backgroundColor: "#3aa73f",
                width: 923,
                height: levelPx
            }}>
            </div>
            <div style={{
                visibility: overflow,
                position: "absolute",
                top: props.offsetPx - levelPx,
                left: 1420,
                backgroundColor: "#3aa73f",
                width: 60,
                height: 20
            }}>
            </div>
            <div style={{
                visibility: overflow,
                position: "absolute",
                top: props.offsetPx - levelPx + 20,
                left: 1450,
                backgroundColor: "#3aa73f",
                width: 30,
                height: props.heightPx - 10
            }}>
            </div>
            <div style={{
                position: "absolute",
                top: props.heightPx - 27,
                left: 590,
                backgroundColor: "#3aa73f",
                width: flowPx,
                height: props.heightPx + 17
            }}>
            </div>
        </div>
    )
}

export default FluidTank;