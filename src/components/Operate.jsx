import {Button, ButtonGroup} from "react-bootstrap";
import {RESET, RUN, STOP} from "../simulation/reducer";

const Operate = ({status, onChange, finished}) => (
    <ButtonGroup style={{width: "300px"}}>
        <Button variant={status === RUN ? "dark" : "outline-dark"} disabled={finished}
                onClick={() => onChange(RUN)}>Run</Button>
        <Button variant={status === STOP ? "dark" : "outline-dark"}
                onClick={() => onChange(STOP)}>Stop</Button>
        <Button variant={status === RESET ? "dark" : "outline-dark"}
                onClick={() => onChange(RESET)}>Reset</Button>
    </ButtonGroup>
);

export default Operate;
