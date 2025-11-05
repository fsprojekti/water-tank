import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ManualContext } from '../contexts/ManualContext.jsx';
import { TankContext } from '../contexts/TankContext.jsx';

import Valve from '../components/Valve.jsx';
import ValveRandom from '../components/ValveRandom.jsx';
import FluidTank from '../components/Tank.jsx';
import DisplayVar from '../components/DisplayVar.jsx';
import DisplayVarEval from '../components/DisplayVarEval.jsx';
import Operate from '../components/Operate.jsx';
import Chart from '../components/Chart.jsx';
import { Row } from 'react-bootstrap';
import PlantLayout from '../components/PlantLayout.jsx';

export default function ManualControl() {
    const {
        config,
        manual_operate, start, stop, reset,
        setValveInpPos, setValveOutPos,
    } = useContext(ManualContext);

    // Tank physics (level/flows)
    const {
        time: tankTime,
        level: tankLevel,
        flowIn: tankFlowIn,
        flowOut: tankFlowOut,
    } = useContext(TankContext);

    // --- config paths (new structure)
    const height_m     = config?.tank?.parameters?.height ?? 1;
    const offsetPx     = config?.tank?.parameters?.offsetPx ?? 0;
    const m2Px         = config?.tank?.render?.m2Px ?? 350;
    const flowMaxInlet = config?.mechanical?.hydraulics?.intake?.flow_max ?? 0.005;
    const stepSec      = config?.tank?.simulation?.step ?? 0.1;

    const refLevel = (
        config?.manual?.evaluation?.referenceLevel ??
        config?.evaluationManual?.referenceLevel ??
        0.5
    );

    // === inline chart history (rolling window) ===
    const chartWindowSec = config?.manual?.chart?.windowSec ?? 100;

    const [tArr, setTArr] = useState([]);
    const [hArr, setHArr] = useState([]);
    const [rArr, setRArr] = useState([]);
    const [eArr, setEArr] = useState([]);

    const lastTRef = useRef(null);

    useEffect(() => {
        // avoid duplicate pushes in strict mode double-invoke
        if (lastTRef.current === tankTime) return;
        lastTRef.current = tankTime;

        const maxLen = Math.max(50, Math.ceil(chartWindowSec / (stepSec || 0.1)) + 10);

        setTArr(prev => pushTrim(prev, tankTime, maxLen));
        setHArr(prev => pushTrim(prev, tankLevel, maxLen));
        setRArr(prev => pushTrim(prev, refLevel, maxLen));
        setEArr(prev => {
            const lastCum = prev.at(-1) ?? 0;
            const inc = Math.abs(refLevel - tankLevel);
            return pushTrim(prev, lastCum + inc, maxLen);
        });
    }, [tankTime, tankLevel, refLevel, chartWindowSec, stepSec]);

    const chartData = useMemo(() => ({
        time: tArr,
        level: hArr,
        reference: rArr,
        error: eArr,
    }), [tArr, hArr, rArr, eArr]);

    return (
        <PlantLayout>
            <div
                style={{
                    marginTop: 6,
                    marginLeft: 40,
                    height: 700,
                    width: 1500,
                }}
            >
                {/* Tank visual */}
                <FluidTank
                    flow={(tankFlowIn / flowMaxInlet) * 100}
                    heightPx={height_m * m2Px}
                    offsetPx={offsetPx}
                    level={(tankLevel / height_m) * 100}
                />

                {/* INTAKE valve: manual control */}
                <Valve
                    top={270}
                    left={115}
                    onPositionChange={setValveInpPos}
                />

                {/* OUTLET valve: keep the same UI component, random disabled here */}
                <ValveRandom
                    top={380}
                    left={115}
                    onChange={setValveOutPos}
                    random={{
                        enabled: false,
                        intervalMs: 2500,
                        stepMin: 2,
                        stepMax: 5,
                        flipBase: 0.05,
                        flipEdgeStrength: 0.4,
                    }}
                    ui={{ disableInputsWhenRandom: true, manualEditDisablesRandom: true }}
                />

                {/* Readouts */}
                <DisplayVar
                    top={705}
                    left={880}
                    value={tankLevel}
                    unit="m"
                    name="Level"
                    decimal={3}
                />
                <DisplayVar
                    top={155}
                    left={250}
                    value={tankFlowIn}
                    unit="m³/s"
                    name="Flow"
                    decimal={5}
                />
                <DisplayVar
                    top={542}
                    left={250}
                    value={tankFlowOut}
                    unit="m³/s"
                    name="Flow"
                    decimal={5}
                />
                <DisplayVarEval
                    top={705}
                    left={600}
                    value={refLevel}
                    unit="m"
                    name="Reference"
                    decimal={5}
                />

                {/* Operate controls */}
                <Row className="d-flex justify-content-center" style={{ paddingTop: '750px' }}>
                    <Operate
                        state={manual_operate}
                        stateReport={(state) => {
                            if (state === 'RUN') start();
                            else if (state === 'STOP') stop();
                            else if (state === 'RESET') reset();
                        }}
                    />
                </Row>

                {/* Chart */}
                <div style={{ marginTop: 12 }}>
                    <Chart windowSec={chartWindowSec} data={chartData} />
                </div>
            </div>
        </PlantLayout>
    );
}

/* --- little helper to trim rolling arrays --- */
function pushTrim(arr, value, maxLen) {
    const out = arr.length >= maxLen ? arr.slice(arr.length - maxLen + 1) : arr.slice(0);
    out.push(value);
    return out;
}
