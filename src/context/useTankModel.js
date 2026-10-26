import {useCallback, useContext, useEffect} from "react";
import config from "../config";
import {RESET, RUN, SET_INPUT, SET_STATUS, TICK} from "../simulation/reducer";
import {nextSeed} from "../simulation/schedule";
import {SimulationContext} from "./simulationContext";

//Model state, actions and simulation loop for one page
export const useTankModel = (mode) => {
    const {state, dispatch} = useContext(SimulationContext);
    const model = state[mode];

    useEffect(() => {
        if (model.status !== RUN) return undefined;
        const interval = setInterval(() => dispatch({mode, type: TICK}), config.simulation.step * 1000 / (model.speed ?? 1));
        return () => clearInterval(interval);
    }, [mode, model.status, model.speed, dispatch]);

    //Reset draws a new consumer pattern unless the seed is fixed in config
    const setStatus = useCallback(
        (status) => dispatch({mode, type: SET_STATUS, status, ...(status === RESET && {seed: nextSeed()})}),
        [mode, dispatch]);
    const setInput = useCallback((name, value) => dispatch({mode, type: SET_INPUT, name, value}), [mode, dispatch]);

    return {model, setStatus, setInput};
};
