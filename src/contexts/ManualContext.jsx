import React, {
    createContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo,
} from 'react';
import config from '../../config.json';

export const ManualContext = createContext(null);

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function ManualProvider({ children }) {
    // --- Core states
    const [manual_operate, set_manual_operate] = useState('STOP');
    const [manual_time, set_manual_time] = useState(0);
    const [manual_tankLevel, set_manual_tankLevel] = useState(0);

    const [manual_tankFlowInp, set_manual_tankFlowInp] = useState(0);
    const [manual_valveInpPos, set_manual_valveInpPos] = useState(0);

    const [manual_tankFlowOut, set_manual_tankFlowOut] = useState(0);
    const [manual_valveOutPos, set_manual_valveOutPos] = useState(0);

    // --- History for chart
    const [manual_dataTime, set_manual_dataTime] = useState([]);
    const [manual_dataTankLevel, set_manual_dataTankLevel] = useState([]);
    const [manual_dataReferenceLevel, set_manual_dataReferenceLevel] = useState([]);
    const [manual_dataError, set_manual_dataError] = useState([]);

    const step = config.simulation.step;

    // --- Refs for latest values (avoid stale closures in intervals)
    const timeRef = useRef(0);
    const levelRef = useRef(0);
    const flowInRef = useRef(0);
    const flowOutRef = useRef(0);

    useEffect(() => { timeRef.current = manual_time; }, [manual_time]);
    useEffect(() => { levelRef.current = manual_tankLevel; }, [manual_tankLevel]);
    useEffect(() => { flowInRef.current = manual_tankFlowInp; }, [manual_tankFlowInp]);
    useEffect(() => { flowOutRef.current = manual_tankFlowOut; }, [manual_tankFlowOut]);

    // --- Inflow derived from intake valve position
    useEffect(() => {
        set_manual_tankFlowInp(config.intake.flow_max * (manual_valveInpPos / 100));
    }, [manual_valveInpPos]);

    // --- Outflow derived from outlet valve position + current level
    useEffect(() => {
        const g = 9.81;
        const out =
            Math.sqrt(2 * g * Math.max(0, levelRef.current)) *
            (manual_valveOutPos / 100) /
            config.drain.valveConstant;
        set_manual_tankFlowOut(out);
    }, [manual_valveOutPos, manual_tankLevel]);

    // --- Helpers to set valve positions (intake/outlet)
    const setValveInpPos = useCallback((pct) => {
        const v = clamp(Number(pct) || 0, 0, 100);
        set_manual_valveInpPos(v);
    }, []);

    /**
     * setValveOutPos:
     * By default, manual edits DISABLE random consumption (keepRandom=false).
     * Pass { keepRandom: true } to preserve random mode when setting programmatically.
     */
    const setValveOutPos = useCallback((pct, opts = {}) => {
        const { keepRandom = false } = opts;
        const v = clamp(Number(pct) || 0, 0, 100);
        if (!keepRandom && outRandomOn) setOutRandomOn(false);
        set_manual_valveOutPos(v);
    }, /* deps injected below */); // filled after outRandomOn defined

    // --- Consumption (random) mode for OUTLET valve
    const [outRandomOn, setOutRandomOn] = useState(false);
    const [outRandomCfg, setOutRandomCfg] = useState({
        mode: 'walk',          // 'walk' | 'uniform'
        intervalMs: 1000,      // how often to change position
        step: 5,               // ± step for walk (in %)
        min: 0,
        max: 100,
    });

    const toggleOutConsumption = useCallback((on) => setOutRandomOn(!!on), []);
    const setOutConsumptionConfig = useCallback((cfg) => {
        setOutRandomCfg((prev) => ({ ...prev, ...cfg }));
    }, []);

    // Now that outRandomOn exists, finalize the setValveOutPos callback deps:
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const _setValveOutPos = useCallback((pct, opts = {}) => {
        const { keepRandom = false } = opts;
        const v = clamp(Number(pct) || 0, 0, 100);
        if (!keepRandom && outRandomOn) setOutRandomOn(false);
        set_manual_valveOutPos(v);
    }, [outRandomOn]);

    // replace the earlier placeholder with the finalized one
    // (this keeps the exported name stable)
    // eslint-disable-next-line no-unused-vars
    const setValveOutPosFinal = _setValveOutPos;

    // --- Interval to update OUTLET valve while random mode is ON
    const outRandIntervalRef = useRef(null);
    useEffect(() => {
        if (outRandIntervalRef.current) {
            clearInterval(outRandIntervalRef.current);
            outRandIntervalRef.current = null;
        }
        if (!outRandomOn) return;

        const { mode, intervalMs, step: walkStep, min, max } = outRandomCfg;
        const safeInterval = Math.max(50, intervalMs);

        outRandIntervalRef.current = setInterval(() => {
            set_manual_valveOutPos((prev) => {
                let next;
                if (mode === 'uniform') {
                    next = min + Math.random() * (max - min);
                } else {
                    // random walk
                    const delta = (Math.random() * 2 - 1) * walkStep;
                    next = prev + delta;
                }
                return clamp(next, min, max);
            });
        }, safeInterval);

        return () => {
            if (outRandIntervalRef.current) {
                clearInterval(outRandIntervalRef.current);
                outRandIntervalRef.current = null;
            }
        };
    }, [outRandomOn, outRandomCfg]);

    // --- Start/Stop/Reset helpers
    const start = useCallback(() => set_manual_operate('RUN'), []);
    const stop  = useCallback(() => set_manual_operate('STOP'), []);

    const reset = useCallback(() => {
        set_manual_operate('STOP');
        set_manual_time(0);
        set_manual_tankLevel(0);
        set_manual_dataTime([]);
        set_manual_dataTankLevel([]);
        set_manual_dataReferenceLevel([]);
        set_manual_dataError([]);
    }, []);

    // --- Main simulation interval (depends on RUN/STOP)
    const simIntervalRef = useRef(null);
    useEffect(() => {
        if (simIntervalRef.current) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
        }
        if (manual_operate !== 'RUN') return;

        simIntervalRef.current = setInterval(() => {
            // time
            const nextTime = Number((timeRef.current + step).toFixed(1));
            timeRef.current = nextTime;
            set_manual_time(nextTime);

            // integrate level
            const dV = (flowInRef.current - flowOutRef.current) * step;
            const dH = dV / config.tank.area;
            const unclamped = levelRef.current + dH;
            const nextLevel = clamp(unclamped, 0, config.tank.height);
            levelRef.current = nextLevel;
            set_manual_tankLevel(nextLevel);

            // sample to chart every 0.1s
            if ((nextTime * 10) % 1 === 0) {
                set_manual_dataTime((prev) => [...prev, nextTime]);
                set_manual_dataTankLevel((prev) => [...prev, nextLevel]);
                set_manual_dataReferenceLevel((prev) => [...prev, config.evaluationManual.referenceLevel]);
                set_manual_dataError((prev) => {
                    const last = prev.at(-1) ?? 0;
                    const err = Math.abs(nextLevel - config.evaluationManual.referenceLevel);
                    return [...prev, last + err];
                });
            }
        }, step * 1000);

        return () => {
            if (simIntervalRef.current) {
                clearInterval(simIntervalRef.current);
                simIntervalRef.current = null;
            }
        };
    }, [manual_operate, step]);

    // --- External RESET handler
    useEffect(() => {
        if (manual_operate === 'RESET') reset();
    }, [manual_operate, reset]);

    // --- Memoize provider value to reduce renders
    const value = useMemo(() => ({
        // state
        manual_operate, set_manual_operate,
        manual_time, manual_tankLevel,
        manual_tankFlowInp, manual_tankFlowOut,
        manual_valveInpPos, manual_valveOutPos,

        // history
        manual_dataTime, manual_dataTankLevel,
        manual_dataReferenceLevel, manual_dataError,

        // controls
        setValveInpPos,
        setValveOutPos: setValveOutPosFinal,   // expose the finalized version
        start, stop, reset,

        // consumption (random) controls for OUTLET
        outRandomOn,
        outRandomCfg,
        toggleOutConsumption,
        setOutConsumptionConfig,

        // config (if needed by components)
        config,
    }), [
        manual_operate,
        manual_time, manual_tankLevel,
        manual_tankFlowInp, manual_tankFlowOut,
        manual_valveInpPos, manual_valveOutPos,
        manual_dataTime, manual_dataTankLevel,
        manual_dataReferenceLevel, manual_dataError,
        setValveInpPos, setValveOutPosFinal,
        start, stop, reset,
        outRandomOn, outRandomCfg,
        toggleOutConsumption, setOutConsumptionConfig,
        config,
    ]);

    return (
        <ManualContext.Provider value={value}>
            {children}
        </ManualContext.Provider>
    );
}
