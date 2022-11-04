import React, {useState, useContext, useCallback, useEffect} from 'react'

export const AppContext = React.createContext(null);

export const ContextWrapper = (props) => {

    //App control
    const [app, setApp] = useState({
        tab: "MANUAL_CONTROLLER"
    })

    //Parameters
    const [parameters, setParameters] = useState({
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

    })
    const [time, setTime] = useState(0);
    const [tankLevel, setTankLevel] = useState(0.0);
    const [tankFlowInpMax, setTankFlowInpMax] = useState(0.0025);
    const [tankFlowInp, setTankFlowInp] = useState(0);
    const [valveInpPos, setValveInpPos] = useState(0);
    const [tankFlowOut, setTankFlowOut] = useState(0);
    const [valveOutPos, setValveOutPos] = useState(0);

    const [evaluateError, setEvaluateError] = useState(0.0);
    const [evaluateTime, setEvaluateTime] = useState(0.0);
    const [evaluateStart, setEvaluateStart] = useState(false);






    //Initialize new game
    // const apiGameStart = useCallback(() => {
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             let data = await axios.get('game/start');
    //             resolve();
    //         } catch (e) {
    //             console.log(e);
    //             reject(e);
    //         }
    //     })
    // }, [])

    return (
        <AppContext.Provider value={{
            app, setApp,
            parameters, setParameters,
            tankLevel, setTankLevel,
            valveInpPos, setValveInpPos,
            tankFlowInpMax, setTankFlowInpMax,
            tankFlowInp, setTankFlowInp,
            valveOutPos, setValveOutPos,
            tankFlowOut, setTankFlowOut,
            evaluateTime, setEvaluateTime,
            evaluateError, setEvaluateError,
            evaluateStart, setEvaluateStart,
            time, setTime
        }}>
            {props.children}
        </AppContext.Provider>
    )
};