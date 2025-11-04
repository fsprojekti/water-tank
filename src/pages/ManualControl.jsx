import { useContext } from 'react';
import { ManualContext } from '../contexts/ManualContext.jsx';

import Valve from '../components/Valve.jsx';
import ValveRandom from '../components/ValveRandom.jsx';
import FluidTank from '../components/FluidTank.jsx';
import DisplayVar from '../components/DisplayVar.jsx';
import DisplayVarEval from '../components/DisplayVarEval.jsx';
import Operate from '../components/Operate.jsx';
import Chart from '../components/Chart.jsx';
import { Row } from 'react-bootstrap';
import PlantLayout from '../components/PlantLayout.jsx';

export default function ManualControl() {
    const {
        // config & sim state
        config,
        manual_operate, start, stop, reset,
        manual_tankLevel,
        manual_tankFlowInp, manual_tankFlowOut,

        // valves
        manual_valveOutPos,
        setValveInpPos, setValveOutPos,

        // consumption (random) controls for OUTLET
        outRandomOn, outRandomCfg, toggleOutConsumption,

        // chart data
        manual_dataTime, manual_dataTankLevel, manual_dataReferenceLevel, manual_dataError,
    } = useContext(ManualContext);

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
                <FluidTank
                    flow={(manual_tankFlowInp / config.intake.flow_max) * 100}
                    heightPx={config.tank.height * config.render.m2Px}
                    offsetPx={config.tank.offsetPx}
                    level={(manual_tankLevel / config.tank.height) * 100}
                />

                {/* INTAKE valve: plain manual control */}
                <Valve
                    top={270}
                    left={115}
                    onPositionChange={setValveInpPos}   // use the modern prop
                />

                <ValveRandom
                    top={380}
                    left={115}
                    onChange={setValveOutPos}
                    random={{
                        enabled: false,        // start manual; toggle switch to enable
                        intervalMs: 2500,
                        stepMin: 2,
                        stepMax: 5,
                        flipBase: 0.05,
                        flipEdgeStrength: 0.4, // stronger tendency to flip near the target edge
                    }}
                    ui={{ disableInputsWhenRandom: true, manualEditDisablesRandom: true }}
                />

                {/* Readouts */}
                <DisplayVar
                    top={705}
                    left={880}
                    value={manual_tankLevel}
                    unit="m"
                    name="Level"
                    decimal={3}
                />
                <DisplayVar
                    top={155}
                    left={250}
                    value={manual_tankFlowInp}
                    unit="m³/s"
                    name="Flow"
                    decimal={5}
                />
                <DisplayVar
                    top={542}
                    left={250}
                    value={manual_tankFlowOut}
                    unit="m³/s"
                    name="Flow"
                    decimal={5}
                />
                <DisplayVarEval
                    top={705}
                    left={600}
                    value={config.evaluationManual.referenceLevel}
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
                <Chart
                    data={{
                        time: manual_dataTime,
                        level: manual_dataTankLevel,
                        reference: manual_dataReferenceLevel,
                        error: manual_dataError,
                    }}
                />
            </div>
        </PlantLayout>
    );
}
