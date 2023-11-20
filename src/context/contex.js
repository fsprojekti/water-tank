import React, {useState, useContext, useCallback, useEffect} from 'react'
import config from "../config";

export const AppContext = React.createContext(null);

export const ContextWrapper = (props) => {

    //App control
    const [app, setApp] = useState({
        tab: "MANUAL_CONTROLLER"
    })

    //Manual controller
    const [manualController, setManualController] = useState({
        //Parameters
        parameters: {
            //Tank parameters [m]
            tank_height: 1,
            //Tank area [m^2]
            tank_area: 0.1,
            //Water intake [m³/s]
            flow_max: 0.0025,
            //Valve output constant
            valve_out_k: 885.89,
            //Evaluation time for control system [s]
            measureTime: 60,
            //Evaluation reference height   [m]
            referenceHeight: 0.5,
            //Valve intake max flow [m³/s]
            tankFlowInpMax: 0.0025,
        },
    })

    //Three modes are available: RUN, STOP, RESET
    const [manual_operate, set_manual_operate] = useState("STOP");
    const [manual_time, set_manual_time] = useState(0);
    const [manual_tankLevel, set_manual_tankLevel] = useState(0);
    const [manual_tankFlowInp, set_manual_tankFlowInp] = useState(0);
    const [manual_valveInpPos, set_manual_valveInpPos] = useState(0);
    const [manual_tankFlowOut, set_manual_tankFlowOut] = useState(0);
    const [manual_valveOutPos, set_manual_valveOutPos] = useState(0);
    const [manual_dataTime, set_manual_dataTime] = useState([]);
    const [manual_dataTankLevel, set_manual_dataTankLevel]=useState([]);
    const [manual_dataReferenceLevel, set_manual_dataReferenceLevel]=useState([]);
    const [manual_dataError, set_manual_dataError]=useState([]);

    const [mechanical_operate, set_mechanical_operate] = useState("STOP");
    const [mechanical_time, set_mechanical_time] = useState(0);
    const [mechanical_tankLevel, set_mechanical_tankLevel] = useState(0.0);
    const [mechanical_tankLevelPx, set_mechanical_tankLevelPx] = useState(0);
    const [mechanical_tankFlowInp, set_mechanical_tankFlowInp] = useState(0);
    const [mechanical_valveInpPos, set_mechanical_valveInpPos] = useState(0);
    const [mechanical_tankFlowOut, set_mechanical_tankFlowOut] = useState(0);
    const [mechanical_valveOutPos, set_mechanical_valveOutPos] = useState(0);
    const [mechanical_dataTime, set_mechanical_dataTime] = useState([]);
    const [mechanical_dataTankLevel, set_mechanical_dataTankLevel]=useState([]);
    const [mechanical_dataReferenceLevel, set_mechanical_dataReferenceLevel]=useState([]);
    const [mechanical_dataError, set_mechanical_dataError]=useState([]);


    const [parameters, set_parameters] = useState({
        //Meter to px ratio [px/m]
        k_meter_px: 350,
    })

    //Mechanical controller
    const [mechanicalParameters, setMechanicalParameters] = useState({
        // //Rod vertical parameters [m]
        // rod1Min: 0,
        // //Rod vertical parameters [m]
        // rod1Max: 2,
        // //Swing point limitations [Px]
        swingPointLimitsPx: [350, 750],
        //Swing rod length [Px]
        swingRodLengthPx: 2 * 350,
        //Platoon rod length [Px]
        platoonRodLengthMaxPx: 1.5 * 350,
        //Pontoon height [Px]
        pontoonHeightPx: 50,
    })

    const [coordinateXSwingPx, set_coordinateXSwingPx] = useState(600);
    const [coordinateYPlatoonPx, set_coordinateYPlatoonPx] = useState(0);
    const [mechanical_rod1, set_mechanical_rod1] = useState(0.01);
    const [valueSwing, set_valueSwing] = useState(0.5);
    const [pointValveInpPx, set_pointValveInpPx] = useState([0, 0]);
    const [valveInpPos, set_valveInpPos] = useState(0);
    const [l3, set_l3] = useState(1.3);
    const [l4, set_l4] = useState(1.45);
    const [governorPositionPx, set_governorPositionPx] = useState(0);

    return (
        <AppContext.Provider value={{
            app, setApp,
            parameters, set_parameters,
            manualController, setManualController,
            manual_operate, set_manual_operate,
            manual_time, set_manual_time,
            manual_tankLevel, set_manual_tankLevel,
            manual_tankFlowInp, set_manual_tankFlowInp,
            manual_valveInpPos, set_manual_valveInpPos,
            manual_tankFlowOut, set_manual_tankFlowOut,
            manual_valveOutPos, set_manual_valveOutPos,
            mechanical_operate, set_mechanical_operate,
            mechanical_time, set_mechanical_time,
            mechanical_tankLevel, set_mechanical_tankLevel,
            mechanical_tankFlowInp, set_mechanical_tankFlowInp,
            mechanical_valveInpPos, set_mechanical_valveInpPos,
            mechanical_tankFlowOut, set_mechanical_tankFlowOut,
            mechanical_valveOutPos, set_mechanical_valveOutPos,
            mechanicalParameters, setMechanicalParameters,
            mechanical_rod1, set_mechanical_rod1,
            coordinateXSwingPx, set_coordinateXSwingPx,
            coordinateYPlatoonPx, set_coordinateYPlatoonPx,
            valueSwing, set_valueSwing,
            pointValveInpPx, set_pointValveInpPx,
            valveInpPos, set_valveInpPos,
            mechanical_tankLevelPx, set_mechanical_tankLevelPx,
            l3, set_l3,
            l4, set_l4,
            governorPositionPx, set_governorPositionPx,
            manual_dataTime, set_manual_dataTime,
            manual_dataTankLevel, set_manual_dataTankLevel,
            manual_dataReferenceLevel, set_manual_dataReferenceLevel,
            manual_dataError, set_manual_dataError,
            mechanical_dataTime, set_mechanical_dataTime,
            mechanical_dataTankLevel, set_mechanical_dataTankLevel,
            mechanical_dataReferenceLevel, set_mechanical_dataReferenceLevel,
            mechanical_dataError, set_mechanical_dataError
        }}>
            {props.children}
        </AppContext.Provider>
    )
};