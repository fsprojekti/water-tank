import { useEffect, useMemo, useRef, useState } from 'react';
import RangeSlider from 'react-bootstrap-range-slider';
import { Form, InputGroup, Row, Col } from 'react-bootstrap';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Random-walk valve with edge-skewed direction changes.
 *
 * Layout (absolute):
 *  - top=0, left=0
 *
 * Behavior:
 *  - onChange(value:number)
 *  - defaultValue=0, min=0, max=100, step=1 (step is UI input step)
 *  - disabled=false
 *
 * Random config (all optional):
 *  - random.enabled=false
 *  - random.intervalMs=300        // tick period
 *  - random.stepMin=1             // % per tick
 *  - random.stepMax=3             // % per tick
 *  - random.flipBase=0.05         // base flip probability (0..1)
 *  - random.flipEdgeStrength=0.4  // extra flip prob near target edge (0..1)
 *    // effective flip prob = clamp(flipBase + flipEdgeStrength * edgeProximity, 0..1)
 *    // edgeProximity = posNorm when opening, (1-posNorm) when closing
 *
 * UI:
 *  - ui.disableInputsWhenRandom=true
 *  - ui.manualEditDisablesRandom=true
 *  - ui.showSummary=true
 */
export default function ValveRandom({
                                        // layout
                                        top = 0,
                                        left = 0,

                                        // callbacks & value range
                                        onChange,
                                        defaultValue = 0,
                                        min = 0,
                                        max = 100,
                                        step = 1,
                                        disabled = false,

                                        // behavior
                                        random = {},
                                        ui = {},
                                        style,
                                    }) {
    const {
        enabled: randomEnabled = false,
        intervalMs = 300,
        stepMin = 1,
        stepMax = 3,
        flipBase = 0.05,
        flipEdgeStrength = 0.4,
    } = random;

    const {
        disableInputsWhenRandom = true,
        manualEditDisablesRandom = true,
        showSummary = true,
    } = ui;

    const [pos, setPos] = useState(() => clamp(Number(defaultValue) || 0, min, max));
    const [isRandom, setIsRandom] = useState(!!randomEnabled);

    const dirRef = useRef(1);      // +1 opening, -1 closing
    const timerRef = useRef(null);

    // Notify parent
    useEffect(() => { onChange?.(pos); }, [pos, onChange]);

    // Walk engine
    useEffect(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (!isRandom || disabled) return;

        const dt = Math.max(50, Number(intervalMs) || 300);

        timerRef.current = setInterval(() => {
            setPos((prev) => {
                const span = Math.max(1e-9, max - min);
                const norm = (prev - min) / span; // 0..1
                const dir = dirRef.current > 0 ? 1 : -1;

                // Edge proximity toward the direction we're heading
                const edgeProx = dir > 0 ? norm : (1 - norm);

                // Flip probability grows near the edge
                const pFlip = clamp(flipBase + flipEdgeStrength * edgeProx, 0, 1);

                // Maybe flip
                if (Math.random() < pFlip) dirRef.current = -dir;

                // Step size
                const mag = stepMin + Math.random() * Math.max(0, stepMax - stepMin);
                let next = prev + dirRef.current * mag;

                // Clamp & bounce
                if (next >= max-10) { next = max-10; dirRef.current = -1; }
                if (next <= min+10) { next = min+10; dirRef.current =  1; }

                return clamp(next, min, max);
            });
        }, dt);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRandom, disabled, intervalMs, stepMin, stepMax, flipBase, flipEdgeStrength, min, max]);

    // UI handlers
    const display = useMemo(() => Math.round(pos), [pos]);
    const inputsDisabled = disabled || (disableInputsWhenRandom && isRandom);

    const setManual = (v) => {
        if (manualEditDisablesRandom && isRandom) setIsRandom(false);
        const val = clamp(v, min, max);
        // decide a new direction based on where we are vs center (optional heuristic)
        dirRef.current = val >= pos ? 1 : -1;
        setPos(val);
    };

    const summary = useMemo(() => {
        if (!isRandom) return 'manual';
        return "";//`walk: step ${stepMin}–${stepMax}%, flip base ${flipBase}, edge +${flipEdgeStrength}`;
    }, [isRandom, stepMin, stepMax, flipBase, flipEdgeStrength]);

    return (
        <div
            className="d-flex flex-column"
            style={{
                position: 'absolute',
                top,
                left,
                backgroundColor: '#D7DBDD',
                border: '2px solid #AEB6BF',
                borderRadius: 5,
                padding: 8,
                minWidth: 280,
                ...style,
            }}
        >
            <InputGroup size="sm" className="mb-2">
                <InputGroup.Text>Position</InputGroup.Text>
                <Form.Control
                    type="number"
                    value={display}
                    min={min}
                    max={max}
                    step={step}
                    disabled={inputsDisabled}
                    onChange={(e) => {
                        const n = e.target.value === '' ? 0 : Number(e.target.value);
                        setManual(Number.isFinite(n) ? n : 0);
                    }}
                    style={{ textAlign: 'right' }}
                />
                <InputGroup.Text>%</InputGroup.Text>
            </InputGroup>

            <RangeSlider
                value={pos}
                min={min}
                max={max}
                step={step}
                disabled={inputsDisabled}
                tooltip="off"
                onChange={(e) => setManual(Number(e.target.value) || 0)}
            />

            <Row className="mt-2 g-2 align-items-center">
                <Col xs="auto">
                    <Form.Check
                        type="switch"
                        id="valve-walk-edge-switch"
                        label="Consumption mode"
                        checked={isRandom}
                        disabled={disabled}
                        onChange={(e) => setIsRandom(e.target.checked)}
                    />
                </Col>
                {showSummary && (
                    <Col xs="auto">
                        <span style={{ fontSize: 12, opacity: 0.8 }}>{summary}</span>
                    </Col>
                )}
            </Row>
        </div>
    );
}
