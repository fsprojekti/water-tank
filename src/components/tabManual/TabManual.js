import {useContext} from "react";
import {AppContext} from "../../context/contex";
import Valve from "../valve/Valve";
import modelImage from "./ManualControlModel.png";
import {ProgressBar} from "react-bootstrap";
import FluidTank from "../FluidTank";


const TabManual = () => {

    const context = useContext(AppContext);

    return (

        // <div  style={{backgroundImage: `url(${modelImage})`, width:"1500",height:"500"}}>
        //
        // </div>
        <div style={{marginTop:"20px", marginLeft:"40px",height:"800px", width:"1500px",backgroundImage: `url(${modelImage})`,backgroundSize:"1500px"}}>
            <FluidTank flow={0.5}/>
        </div>


    )
}

export default TabManual;