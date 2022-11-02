import ReactBootstrapSlider from "react-bootstrap-slider";
import {useEffect, useState} from "react";


const Valve = (props) => {
    const [position, setPosition] = useState(40)

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
                <div className="p-2">
                    <div className={"d-flex justify-content-between"} style={{
                        paddingLeft:"50px",
                        paddingRight:"50px",
                    }}>
                        <div className={"p-1"} ><h6>Position:</h6></div>
                        <div className={"p-1"}><h6>{position}</h6></div>
                        <div className={"p-1"}><h6>%</h6></div>
                    </div>
                </div>
                    {/*<h6>Position: {position} %</h6></div>*/}
                <div style={{
                    paddingBottom: "15px",
                    paddingLeft: "20px",
                    paddingRight: "20px",
                }}>
                    <ReactBootstrapSlider
                        value={position}
                        tooltip={"hide"}
                        change={(data) => {
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