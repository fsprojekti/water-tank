import { useEffect, useMemo, useState } from 'react';
import RangeSlider from 'react-bootstrap-range-slider';
import { Form, InputGroup } from 'react-bootstrap';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function Valve({
                                  top = 0,
                                  left = 0,
                                  initial = 0,
                                  min = 0,
                                  max = 100,
                                  step = 1,
                                  disabled = false,
                                  onPositionChange,
                                  valvePositionReport, // legacy
                              }) {
    const [position, setPosition] = useState(() => clamp(Number(initial) || 0, min, max));

    useEffect(() => {
        onPositionChange?.(position);
        valvePositionReport?.(position);
    }, [position, onPositionChange, valvePositionReport]);

    useEffect(() => {
        setPosition(clamp(Number(initial) || 0, min, max));
    }, [initial, min, max]);

    const displayValue = useMemo(() => Math.round(position), [position]);

    const handleNumeric = (e) => {
        const raw = e.target.value;
        const num = raw === '' ? 0 : Number(raw);
        setPosition(clamp(Number.isFinite(num) ? num : 0, min, max));
    };

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
                minWidth: 260,
            }}
        >
            {/* Label + numeric input with % suffix */}
            <InputGroup size="sm" className="mb-2">
                <InputGroup.Text>Position</InputGroup.Text>
                <Form.Control
                    type="number"
                    value={displayValue}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    onChange={handleNumeric}
                    style={{ textAlign: 'right' }}
                />
                <InputGroup.Text>%</InputGroup.Text>
            </InputGroup>

            {/* Slider */}
            <RangeSlider
                value={position}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                tooltip="off"
                onChange={(e) => setPosition(clamp(Number(e.target.value) || 0, min, max))}
            />
        </div>
    );
}
