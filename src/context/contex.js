import React, {useState, useContext, useCallback, useEffect} from 'react'

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
            //Simulation step [s]
            simulation_step: 0.01,
            //Evaluation time for control system [s]
            measureTime: 60,
            //Evaluation reference height   [m]
            referenceHeight: 0.5,
            //Valve intake max flow [m³/s]
            tankFlowInpMax: 0.0025,

        },
    })

    const [manual_time, set_manual_time] = useState(0);
    const [manual_tankLevel, set_manual_tankLevel] = useState(0);
    const [manual_tankFlowInp, set_manual_tankFlowInp] = useState(0);
    const [manual_valveInpPos, set_manual_valveInpPos] = useState(0);
    const [manual_tankFlowOut, set_manual_tankFlowOut] = useState(0);
    const [manual_valveOutPos, set_manual_valveOutPos] = useState(0);
    const [manual_evaluateStart, set_manual_evaluateStart] = useState(false);
    const [manual_evaluateTime, set_manual_evaluateTime] = useState(0);
    const [manual_evaluateError, set_manual_evaluateError] = useState(0);





    return (
        <AppContext.Provider value={{
            app, setApp,
            manualController, setManualController,
            manual_time, set_manual_time,
            manual_tankLevel, set_manual_tankLevel,
            manual_tankFlowInp, set_manual_tankFlowInp,
            manual_valveInpPos, set_manual_valveInpPos,
            manual_tankFlowOut, set_manual_tankFlowOut,
            manual_valveOutPos, set_manual_valveOutPos,
            manual_evaluateStart, set_manual_evaluateStart,
            manual_evaluateTime, set_manual_evaluateTime,
            manual_evaluateError, set_manual_evaluateError,
        }}>
            {props.children}
        </AppContext.Provider>
    )
};