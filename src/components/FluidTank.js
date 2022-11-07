import {useContext, useEffect, useState} from "react";
import {AppContext} from "../context/contex";
import config from "../config"


const FluidTank = (props) => {
    //Props
    //Max level px
    const levelMaxPx = 350;
    //Max flow animation width px
    const flowMaxPx = 43;
    //Window height
    const bottomLevelPx = config.parameters.render.tankBottomLevelPx;

    //Variables
    //Flow [px]
    let flowPx = props.flow / 100.0 * flowMaxPx;
    //Check if flow is negative and set flow to 0
    if (flowPx < 0) flowPx = 0;
    //Check if flow is bigger than max flow and set flow to max flow
    if (flowPx > flowMaxPx) flowPx = flowMaxPx;


    //Level [px]
    let levelPx = props.level / 100.0 * levelMaxPx;
    //Check if level is negative and set level to 0
    if (levelPx < 0) levelPx = 0;
    //Check if level is bigger than max level and set level to max level
    let overflow = "hidden";
    if (levelPx >= levelMaxPx) {
        levelPx = levelMaxPx;
        overflow = "visible";
    }

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