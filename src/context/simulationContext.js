import {createContext} from "react";
import {createModel, LOAD, MANUAL, MECHANICAL, modelReducer, OPERATOR, PI, TANK, TUNING} from "../simulation/reducer";
import {labTasks} from "../labConfig";

export const SimulationContext = createContext(null);

export const reducer = (state, action) => ({...state, [action.mode]: modelReducer(state[action.mode], action)});

export const createState = () => ({
    ...Object.fromEntries(labTasks.map(({mode}) => [mode, createModel(mode)])),
    [MANUAL]: createModel(MANUAL),
    [MECHANICAL]: createModel(MECHANICAL),
    [OPERATOR]: createModel(OPERATOR),
    [TANK]: createModel(TANK),
    [TUNING]: createModel(TUNING),
    [LOAD]: createModel(LOAD),
    [PI]: createModel(PI),
});
