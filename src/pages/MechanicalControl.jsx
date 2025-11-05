import {useContext} from 'react';
import {MechanicalContext} from '../contexts/MechanicalContext.jsx';

import FluidTank from '../components/Tank.jsx';
import ValveRandom from '../components/ValveRandom.jsx'; // the simple walk version you settled on
import DisplayVar from '../components/DisplayVar.jsx';
import DisplayVarEval from '../components/DisplayVarEval.jsx';
import Operate from '../components/Operate.jsx';
import Chart from '../components/Chart.jsx';
import Mechanism from '../components/Mechanism.jsx';
import {Row} from 'react-bootstrap';
import PlantLayout from "../components/PlantLayout.jsx";

// Minimal slider for l3/l4 (re-using your old Slider API if you have it)
function Slider({top, left, name, unit, min, max, value, onChange}) {
    return (
        <div style={{
            position: 'absolute',
            top,
            left,
            background: '#f6f7f8',
            border: '1px solid #ddd',
            padding: 8,
            borderRadius: 6
        }}>
            <div style={{fontWeight: 600, marginBottom: 4}}>{name}</div>
            <input
                type="range"
                min={min}
                max={max}
                step="0.01"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{width: 220}}
            />
            <div style={{marginTop: 4, fontSize: 12}}>{value.toFixed(2)} {unit}</div>
        </div>
    );
}

export default function MechanicalControl() {
    const {
        config,
        // state
        mechanical_operate, set_mechanical_operate,
        mechanical_time, mechanical_tankLevel,
        mechanical_tankFlowInp, mechanical_tankFlowOut,
        mechanical_valveInpPos, mechanical_valveOutPos,
        // geometry
        l3, set_l3, l4, set_l4,
        // chart data
        mechanical_dataTime, mechanical_dataTankLevel, mechanical_dataReferenceLevel, mechanical_dataError,
        // controls
        setValveOutPos, start, stop, reset,
    } = useContext(MechanicalContext);

    return (
        <PlantLayout>
            <div
                style={{
                    marginTop: 0,
                    marginLeft: 0,
                    height: 700,
                    width: 1500,
                    position: 'relative',
                }}
            >
                {/* Water tank visual */}
                <FluidTank
                    flow={(mechanical_tankFlowInp / config.intake.flow_max) * 100}
                    heightPx={config.tank.height * config.render.m2Px}
                    offsetPx={config.tank.offsetPx}
                    level={(mechanical_tankLevel / config.tank.height) * 100}
                />

                {/* Intake position (read-only) */}
                <div
                    style={{
                        position: 'absolute', top: 300, left: 115,
                        background: '#EEE', border: '1px solid #BBB', borderRadius: 6, padding: 8, minWidth: 220,
                    }}
                >
                    <div style={{fontWeight: 600, marginBottom: 4}}>Intake valve (governor)</div>
                    <div style={{fontSize: 14}}>Position: <b>{Math.round(mechanical_valveInpPos)}%</b></div>
                </div>

                {/* Outlet valve with random walk toggle */}
                <ValveRandom
                    top={380}
                    left={115}
                    onChange={setValveOutPos}
                    random={{
                        enabled: false,     // user toggles on UI
                        intervalMs: 300,
                        stepMin: 1,
                        stepMax: 3,
                        flipBase: 0.05,
                        flipEdgeStrength: 0.4,
                    }}
                    ui={{disableInputsWhenRandom: true, manualEditDisablesRandom: true}}
                />

                {/* Numeric displays */}
                <DisplayVar top={705} left={880} value={mechanical_tankLevel} unit="m" name="Level" decimal={3}/>
                <DisplayVar top={210} left={290} value={mechanical_tankFlowInp} unit="m³/s" name="Flow" decimal={5}/>
                <DisplayVar top={595} left={290} value={mechanical_tankFlowOut} unit="m³/s" name="Flow" decimal={5}/>
                <DisplayVarEval
                    top={705}
                    left={600}
                    value={config.evaluationMechanical?.referenceLevel ?? config.evaluationManual.referenceLevel}
                    unit="m"
                    name="Reference"
                    decimal={5}
                />

                {/* Mechanism canvas (updates governorPositionPx internally) */}
                <div style={{position: 'absolute', top: 0, left: 0}}>
                    <Mechanism
                        width={1400}
                        height={630}
                        config={config}
                        tankLevel={mechanical_tankLevel}
                        l3={l3}
                        l4={l4}
                        onValveChange={(pct) => setValveInpPos(pct)}     // optional
                        style={{ pointerEvents: 'none' }}
                    />
                </div>

                {/* Sliders for geometry */}
                <Slider
                    top={60}
                    left={1200}
                    name="l3 rod"
                    unit="m"
                    min={config.controller.l3Limits[0]}
                    max={config.controller.l3Limits[1]}
                    value={l3}
                    onChange={set_l3}
                />
                <Slider
                    top={160}
                    left={1200}
                    name="l4 rod"
                    unit="m"
                    min={config.controller.l4Limits[0]}
                    max={config.controller.l4Limits[1]}
                    value={l4}
                    onChange={set_l4}
                />



                {/* Operate buttons */}
                <Row className="d-flex justify-content-center" style={{paddingTop: '740px'}}>
                    <Operate
                        state={mechanical_operate}
                        stateReport={(s) => {
                            if (s === 'RUN') start();
                            else if (s === 'STOP') stop();
                            else if (s === 'RESET') reset();
                            else set_mechanical_operate(s);
                        }}
                    />
                </Row>

                {/* Chart */}
                <div style={{marginTop: 12}}>
                    <Chart
                        windowSec={config?.manual?.chart?.windowSec ?? 100}
                        data={{
                            time: mechanical_dataTime,
                            level: mechanical_dataTankLevel,
                            reference: mechanical_dataReferenceLevel,
                            error: mechanical_dataError,
                        }}
                    />
                </div>
            </div>
        </PlantLayout>
    );
}
