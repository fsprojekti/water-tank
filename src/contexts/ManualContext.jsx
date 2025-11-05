import React, {
    createContext, useContext, useEffect, useMemo, useState, useCallback,
} from 'react';
import config from '../../config.json';
import { TankContext } from './TankContext.jsx';

export const ManualContext = createContext(null);

// small clamp
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// config helpers (use your new structure: tank + mechanical)
const getFlowMax = (cfg) =>
    cfg?.mechanical?.hydraulics?.intake?.flow_max ?? cfg?.intake?.flow_max ?? 0.005;

const getDrainK = (cfg) =>
    cfg?.mechanical?.hydraulics?.drain?.valveConstant ?? cfg?.drain?.valveConstant ?? 900;

export function ManualProvider({ children }) {
    // Pull simulation state/APIs from TankContext
    const {
        operate, time, level, flowIn, flowOut,
        setFlowIn, setFlowOut,
        start, stop, reset,
    } = useContext(TankContext);

    // Local manual controls: valve positions (0..100 %)
    const [manual_valveInpPos, set_manual_valveInpPos] = useState(0);
    const [manual_valveOutPos, set_manual_valveOutPos] = useState(0);

    // Mirror old API names by proxying to TankContext
    const manual_operate = operate;
    const manual_time = time;
    const manual_tankLevel = level;
    const manual_tankFlowInp = flowIn;
    const manual_tankFlowOut = flowOut;

    // Keep old setter for operate, delegating to TankContext controls
    const set_manual_operate = useCallback((state) => {
        if (state === 'RUN') start();
        else if (state === 'STOP') stop();
        else if (state === 'RESET') reset();
    }, [start, stop, reset]);

    // Derived inflow from intake valve %
    useEffect(() => {
        const flowMax = getFlowMax(config);
        setFlowIn(flowMax * (manual_valveInpPos / 100));
    }, [manual_valveInpPos, setFlowIn]);

    // Derived outflow from outlet valve % and current level
    useEffect(() => {
        const g = 9.81;
        const K = getDrainK(config) || 1;
        const h = Math.max(0, level);
        const out = (Math.sqrt(2 * g * h) * (manual_valveOutPos / 100)) / K;
        setFlowOut(out);
    }, [manual_valveOutPos, level, setFlowOut]);

    // Public setters (clamped)
    const setValveInpPos = useCallback((pct) => {
        set_manual_valveInpPos(clamp(Number(pct) || 0, 0, 100));
    }, []);

    const setValveOutPos = useCallback((pct) => {
        set_manual_valveOutPos(clamp(Number(pct) || 0, 0, 100));
    }, []);

    const value = useMemo(() => ({
        // state (kept for compatibility with your UI)
        manual_operate, set_manual_operate,
        manual_time, manual_tankLevel,
        manual_tankFlowInp, manual_tankFlowOut,
        manual_valveInpPos, manual_valveOutPos,

        // controls
        setValveInpPos, setValveOutPos,
        start, stop, reset,

        // optionally expose config
        config,
    }), [
        manual_operate, set_manual_operate,
        manual_time, manual_tankLevel,
        manual_tankFlowInp, manual_tankFlowOut,
        manual_valveInpPos, manual_valveOutPos,
        setValveInpPos, setValveOutPos,
        start, stop, reset, config,
    ]);

    return (
        <ManualContext.Provider value={value}>
            {children}
        </ManualContext.Provider>
    );
}
