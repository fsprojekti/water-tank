import ReactBootstrapSlider from "react-bootstrap-slider";
import {useEffect, useState} from "react";


const DisplayVar = (props) => {

    return (
        <div className={"d-flex flex-column"} style={{
            position: "absolute",
            top: props.top,
            left: props.left,
            backgroundColor: "#D7DBDD",
            borderStyle: "solid",
            borderColor: "#AEB6BF",
            borderWidth: "2px",
            borderRadius: "5px",
        }}>


                    <div className={"d-flex align-items-end"} style={{
                        paddingLeft:"20px",
                        paddingRight:"20px",
                    }}>
                        <div className={"p-1"}><b>{props.name}: </b></div>
                        <div className={"p-1"}><b>{props.value.toFixed(props.decimal)}</b></div>
                        <div className={"p-1"}><b><i>{props.unit}</i></b></div>
                    </div>


        </div>

    )
}

export default DisplayVar;