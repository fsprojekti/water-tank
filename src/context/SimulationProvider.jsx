import {useMemo, useReducer} from "react";
import {createState, reducer, SimulationContext} from "./simulationContext";

//Keeps both models alive across page navigation
const SimulationProvider = ({children}) => {
    const [state, dispatch] = useReducer(reducer, undefined, createState);
    const value = useMemo(() => ({state, dispatch}), [state]);
    return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export default SimulationProvider;
