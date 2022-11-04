import ReactBootstrapSlider from "react-bootstrap-slider";
import {useEffect, useState} from "react";


const Evaluate = (props) => {

    return (
        <div className={"d-flex flex-column"} style={{
            position: "absolute",
            top: props.top,
            left: props.left,
            backgroundColor: "#fd8000",
            borderStyle: "solid",
            borderColor: "#ce700f",
            borderWidth: "2px",
            borderRadius: "5px",
        }}>
            <div className={"p-2"} style={{backgroundColor:"#ce700f"}}><h5>Evaluation of control run</h5></div>

            <div className={"d-flex align-items-end"} style={{
                paddingLeft: "20px",
                paddingRight: "20px",
            }}>
                <div className={"p-1"}><b>Time: </b></div>
                <div className={"p-1"}><b>{props.time.toFixed(1)}</b></div>
                <div className={"p-1"}><b>/ {props.timeMax}</b></div>
                <div className={"p-1"}><b><i>s</i></b></div>
            </div>
            <div className={"d-flex align-items-end"} style={{
                paddingLeft: "20px",
                paddingRight: "20px",
            }}>
                <div className={"p-1"}><b>Error: </b></div>
                <div className={"p-1"}><b>{props.error.toFixed(2)}</b></div>
                <div className={"p-1"}><b><i>%</i></b></div>
            </div>


        </div>

    )
}

export default Evaluate;