import RangeSlider from "react-bootstrap-range-slider";
import {useEffect, useState} from "react";


const Valve = (props) => {
    const [position, setPosition] = useState(0)

    useEffect(() => {
        props.valvePositionReport(position);
    }
    ,[position])

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
            <div >
                <div className="pt-1">
                    <div className={"d-flex justify-content-between"} style={{
                        paddingLeft:"50px",
                        paddingRight:"50px",
                    }}>
                        <div className={"p-1"} ><h6>Position:</h6></div>
                        <div className={"p-1"} style={{width:"30px"}}><h6>{position}</h6></div>
                        <div className={"p-1"}><h6>%</h6></div>
                    </div>
                </div>
                    {/*<h6>Position: {position} %</h6></div>*/}
                <div style={{
                    paddingBottom: "5px",
                    paddingLeft: "20px",
                    paddingRight: "20px",
                }}>
                    <RangeSlider
                        value={position}
                        tooltip={"off"}
                        onChange={(data) => {
                            setPosition(data.target.value);
                        }}
                        max={100}
                        min={0}
                    />
                </div>
            </div>

        </div>

    )
}

export default Valve;