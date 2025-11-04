import { Button, ButtonGroup } from 'react-bootstrap';
import { useCallback, useEffect, useState } from 'react';

/**
 * Operate
 * Props:
 *  - state: "RUN" | "STOP" | "RESET" (optional; if provided, treated as source of truth)
 *  - onChange(nextState)  (recommended new callback)
 *  - stateReport(nextState)  (legacy callback kept for back-compat)
 *  - disabled: boolean
 *  - width: number|string (e.g., 600 or "600px")
 *  - labels: { run?: string, stop?: string, reset?: string }
 */
export default function Operate({
                                    state: controlledState,
                                    onChange,
                                    stateReport,
                                    disabled = false,
                                    width = 600,
                                    labels = { run: 'Run', stop: 'Stop', reset: 'Reset' },
                                }) {
    // local state (used when uncontrolled, or to keep UI responsive)
    const [local, setLocal] = useState(controlledState ?? 'STOP');

    // keep local in sync when the parent drives `state`
    useEffect(() => {
        if (controlledState !== undefined && controlledState !== local) {
            setLocal(controlledState);
        }
    }, [controlledState]); // eslint-disable-line react-hooks/exhaustive-deps

    // single notifier for parent callbacks
    const notify = useCallback(
        (next) => {
            onChange?.(next);
            stateReport?.(next); // back-compat
        },
        [onChange, stateReport]
    );

    const set = useCallback(
        (next) => {
            // Update local immediately for snappy UI
            setLocal(next);
            notify(next);
        },
        [notify]
    );

    const btn = (label, val) => (
        <Button
            key={val}
            variant={local === val ? 'dark' : 'outline-dark'}
            onClick={() => set(val)}
            disabled={disabled}
            aria-pressed={local === val}
        >
            {label}
        </Button>
    );

    return (
        <ButtonGroup style={{ display: 'flex', justifyContent: 'center', width }}>
            {btn(labels.run, 'RUN')}
            {btn(labels.stop, 'STOP')}
            {btn(labels.reset, 'RESET')}
        </ButtonGroup>
    );
}
