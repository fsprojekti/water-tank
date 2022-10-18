import React, {useState, useContext, useCallback} from 'react'

export const AppContext = React.createContext(null);

export const ContextWrapper = (props) => {

    //App control
    const [app, setApp] = useState({
        tab: "MANUAL_CONTROLLER"
    })

    //Parameters
    const [parameters, setParameters] = useState({
        //Tank parameters [m]
        tank_width: 0.5,
        tank_depth: 0.1,
        tank_height: 0.5,
        //Water intake [m³/s]
        flow_max: 0.0025
    })

    //Variables
    const [variables, setVariables] = useState({
        //Tank variables
        tank_level: 0,
        //Water intake [m³/s]
        flow_in: 0,
        //Valve out [0...100%]
        valve_out_pos: 0,
    })


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
            variables, setVariables
        }}>
            {props.children}
        </AppContext.Provider>
    )
};