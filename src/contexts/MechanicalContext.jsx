import React, {
    createContext, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import config from '../../config.json';

export const MechanicalContext = createContext(null);

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function MechanicalProvider({ children }) {
    // --- Core states
    const [mechanical_operate, set_mechanical_operate] = useState('STOP');
    const [mechanical_time, set_mechanical_time] = useState(0);
    const [mechanical_tankLevel, set_mechanical_tankLevel] = useState(0);

    const [mechanical_tankFlowInp, set_mechanical_tankFlowInp] = useState(0);
    const [mechanical_valveInpPos, set_mechanical_valveInpPos] = useState(0);

    const [mechanical_tankFlowOut, set_mechanical_tankFlowOut] = useState(0);
    const [mechanical_valveOutPos, set_mechanical_valveOutPos] = useState(0);

    // Mechanical geometry (l3, l4) and governor position (computed by canvas)
    const [l3, set_l3] = useState(config?.controller?.l3Default ?? 1.3);
    const [l4, set_l4] = useState(config?.controller?.l4Default ?? 1.45);
    const [governorPositionPx, set_governorPositionPx] = useState(0);

    // --- History for chart
    const [mechanical_dataTime, set_mechanical_dataTime] = useState([]);
    const [mechanical_dataTankLevel, set_mechanical_dataTankLevel] = useState([]);
    const [mechanical_dataReferenceLevel, set_mechanical_dataReferenceLevel] = useState([]);
    const [mechanical_dataError, set_mechanical_dataError] = useState([]);

    const step = config.simulation.step;

    // --- Refs for latest values (avoid stale closures)
    const tRef = useRef(0);
    const hRef = useRef(0);
    const finRef = useRef(0);
    const foutRef = useRef(0);

    useEffect(() => { tRef.current = mechanical_time; }, [mechanical_time]);
    useEffect(() => { hRef.current = mechanical_tankLevel; }, [mechanical_tankLevel]);
    useEffect(() => { finRef.current = mechanical_tankFlowInp; }, [mechanical_tankFlowInp]);
    useEffect(() => { foutRef.current = mechanical_tankFlowOut; }, [mechanical_tankFlowOut]);

    // --- INTake valve position is driven by governor position (px → %)
    // Old mapping: value = -1.25 * governorPositionPx + 237.5 (then clamp 0..100)
    useEffect(() => {
        let val = -1.25 * governorPositionPx + 237.5;
        val = clamp(val, 0, 100);
        set_mechanical_valveInpPos(val);
    }, [governorPositionPx]);

    // --- Inflow derived from intake valve %
    useEffect(() => {
        set_mechanical_tankFlowInp(config.intake.flow_max * (mechanical_valveInpPos / 100));
    }, [mechanical_valveInpPos]);

    // --- Outflow derived from outlet valve % + level
    useEffect(() => {
        const g = 9.81;
        const out = Math.sqrt(2 * g * Math.max(0, hRef.current)) *
            (mechanical_valveOutPos / 100) / config.drain.valveConstant;
        set_mechanical_tankFlowOut(out);
    }, [mechanical_valveOutPos, mechanical_tankLevel]);

    // --- Controls
    const setValveOutPos = useCallback((pct) => {
        set_mechanical_valveOutPos(clamp(Number(pct) || 0, 0, 100));
    }, []);

    const start = useCallback(() => set_mechanical_operate('RUN'), []);
    const stop  = useCallback(() => set_mechanical_operate('STOP'), []);
    const reset = useCallback(() => {
        set_mechanical_operate('STOP');
        set_mechanical_time(0);
        set_mechanical_tankLevel(0);
        set_mechanical_dataTime([]);
        set_mechanical_dataTankLevel([]);
        set_mechanical_dataReferenceLevel([]);
        set_mechanical_dataError([]);
    }, []);

    // --- Main simulation loop
    const simRef = useRef(null);
    useEffect(() => {
        if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
        if (mechanical_operate !== 'RUN') return;

        simRef.current = setInterval(() => {
            const nextT = Number((tRef.current + step).toFixed(1));
            tRef.current = nextT;
            set_mechanical_time(nextT);

            const dV = (finRef.current - foutRef.current) * step;
            const dH = dV / config.tank.area;
            const nextH = clamp(hRef.current + dH, 0, config.tank.height);
            hRef.current = nextH;
            set_mechanical_tankLevel(nextH);

            if ((nextT * 10) % 1 === 0) {
                set_mechanical_dataTime((p) => [...p, nextT]);
                set_mechanical_dataTankLevel((p) => [...p, nextH]);
                const ref = config.evaluationMechanical?.referenceLevel ?? config.evaluationManual.referenceLevel;
                set_mechanical_dataReferenceLevel((p) => [...p, ref]);
                set_mechanical_dataError((p) => {
                    const last = p.at(-1) ?? 0;
                    return [...p, last + Math.abs(ref - nextH)];
                });
            }
        }, step * 1000);

        return () => { if (simRef.current) clearInterval(simRef.current); };
    }, [mechanical_operate, step]);

    useEffect(() => {
        if (mechanical_operate === 'RESET') reset();
    }, [mechanical_operate, reset]);

    const value = useMemo(() => ({
        // state
        mechanical_operate, set_mechanical_operate,
        mechanical_time, mechanical_tankLevel,
        mechanical_tankFlowInp, mechanical_tankFlowOut,
        mechanical_valveInpPos, mechanical_valveOutPos,

        // geometry / governor
        l3, set_l3,
        l4, set_l4,
        governorPositionPx, set_governorPositionPx,

        // history
        mechanical_dataTime, mechanical_dataTankLevel,
        mechanical_dataReferenceLevel, mechanical_dataError,

        // controls
        setValveOutPos,
        start, stop, reset,

        // config
        config,
    }), [
        mechanical_operate, mechanical_time, mechanical_tankLevel,
        mechanical_tankFlowInp, mechanical_tankFlowOut,
        mechanical_valveInpPos, mechanical_valveOutPos,
        l3, l4, governorPositionPx,
        mechanical_dataTime, mechanical_dataTankLevel,
        mechanical_dataReferenceLevel, mechanical_dataError,
        setValveOutPos, start, stop, reset, config,
    ]);

    return (
        <MechanicalContext.Provider value={value}>
            {children}
        </MechanicalContext.Provider>
    );
}
