import {createContext} from "react";
import {createModel, LOAD, MANUAL, MECHANICAL, modelReducer, OPERATOR, PI, TANK, TUNING} from "../simulation/reducer";

export const SimulationContext = createContext(null);

export const reducer = (state, action) => ({...state, [action.mode]: modelReducer(state[action.mode], action)});

export const createState = () => ({
    [MANUAL]: createModel(MANUAL),
    [MECHANICAL]: createModel(MECHANICAL),
    [OPERATOR]: createModel(OPERATOR),
    [TANK]: createModel(TANK),
    [TUNING]: createModel(TUNING),
    [LOAD]: createModel(LOAD),
    [PI]: createModel(PI),
});
