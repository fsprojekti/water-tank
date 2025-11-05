import React, {
    createContext, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import appConfig from '../../config.json';

// tiny clamp
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* --- helpers: works with both old and new config layouts --- */
const getCfg = (cfg) => ({
    step:   cfg?.common?.simulation?.step ?? cfg?.simulation?.step ?? 0.1,
    area:   cfg?.common?.tank?.area       ?? cfg?.tank?.area       ?? 0.1,
    height: cfg?.common?.tank?.height     ?? cfg?.tank?.height     ?? 1,
});

export const TankContext = createContext(null);

/**
 * TankProvider
 * - integrates tank level H from flows Fin, Fout
 * - exposes setters for flows and basic RUN/STOP/RESET
 *
 * Props (all optional):
 *   config?: object   (defaults to ../../config.json)
 *   initialLevel?: number (m)
 *   autostart?: boolean   (default false)
 */
export function TankProvider({ children, config = appConfig, initialLevel = 0, autostart = false }) {
    const { step, area, height: Hmax } = getCfg(config);

    // core state
    const [operate, setOperate] = useState(autostart ? 'RUN' : 'STOP');
    const [time, setTime] = useState(0);
    const [level, setLevel] = useState(initialLevel);

    // flows (m^3/s) – other modules write these
    const [flowIn,  setFlowIn]  = useState(0);
    const [flowOut, setFlowOut] = useState(0);

    // refs for stable interval reads
    const tRef   = useRef(time);
    const hRef   = useRef(level);
    const finRef = useRef(flowIn);
    const foutRef= useRef(flowOut);

    useEffect(() => { tRef.current = time; },   [time]);
    useEffect(() => { hRef.current = level; },  [level]);
    useEffect(() => { finRef.current = flowIn; },  [flowIn]);
    useEffect(() => { foutRef.current = flowOut; }, [flowOut]);

    // controls
    const start = useCallback(() => setOperate('RUN'), []);
    const stop  = useCallback(() => setOperate('STOP'), []);
    const reset = useCallback(() => {
        setOperate('STOP');
        setTime(0);
        setLevel(initialLevel);
    }, [initialLevel]);

    // simulation loop: integrates volume balance
    const simRef = useRef(null);
    useEffect(() => {
        if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
        if (operate !== 'RUN') return;

        simRef.current = setInterval(() => {
            // time
            const nextT = Number((tRef.current + step).toFixed(1));
            tRef.current = nextT;
            setTime(nextT);

            // integrate level: dH = (Fin - Fout) * dt / Area
            const dV = (finRef.current - foutRef.current) * step;
            const dH = dV / (area || 1);
            const nextH = clamp(hRef.current + dH, 0, Hmax);
            hRef.current = nextH;
            setLevel(nextH);
        }, step * 1000);

        return () => { if (simRef.current) clearInterval(simRef.current); };
    }, [operate, step, area, Hmax]);

    // public api
    const value = useMemo(() => ({
        // state
        operate, time, level,
        flowIn, flowOut,

        // setters
        setFlowIn, setFlowOut,
        setLevelDirect: setLevel, // optional: for setting initial condition externally

        // controls
        start, stop, reset,

        // config passthrough if needed
        config,
    }), [operate, time, level, flowIn, flowOut, start, stop, reset, config]);

    return (
        <TankContext.Provider value={value}>
            {children}
        </TankContext.Provider>
    );
}
