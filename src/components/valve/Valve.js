import {useContext, useState} from "react";
import {AppContext} from "../../context/contex";
import {ProgressBar} from "react-bootstrap";



const Valve = (props) => {
    const [position, setPosition] = useState(40)

    return (
        <ProgressBar variant="success" now={position} />
    )
}

export default Valve;