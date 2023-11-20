import {Button, ButtonGroup} from "react-bootstrap";
import {useEffect, useState} from "react";

const Operate = (props) => {
    const [state, setState] = useState(props.state);

    useEffect(() => {
        props.stateReport(state);
    }, [state]);

    return (
        <ButtonGroup style={{display: 'flex', justifyContent: 'center', width: "600px"}}>
            <Button variant={state === "RUN" ? "dark" : "outline-dark"}
                    onClick={() => setState("RUN")}>Run</Button>
            <Button variant={state === "STOP" ? "dark" : 'outline-dark'}
                    onClick={() => setState("STOP")}>Stop</Button>
            <Button variant={state === "RESET" ? "dark" : 'outline-dark'}
                    onClick={() => setState("RESET")}>Reset</Button>
        </ButtonGroup>
    )
}

export default Operate;