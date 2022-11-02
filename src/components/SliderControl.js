import { useState} from "react";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const SliderControl = (props) => {
    const [position, setPosition] = useState(40)

    return (
        <div style={{width:"300px"}}>
            <Slider min={0} max={100}/>
        </div>
    )
}

export default SliderControl;