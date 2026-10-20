import {useCallback, useEffect, useState} from "react";
import config from "../config";

/**
 * Countdown before an action: start() counts down from config.simulation.countdownSeconds once per second
 * and then calls onDone; cancel() stops it. Returns the remaining count, null when not counting.
 */
const useCountdown = (onDone) => {
    const [count, setCount] = useState(null);

    useEffect(() => {
        if (count === null) return undefined;
        const timeout = setTimeout(() => {
            if (count > 1) {
                setCount(count - 1);
            } else {
                setCount(null);
                onDone();
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [count, onDone]);

    const start = useCallback(() => setCount((current) => current ?? config.simulation.countdownSeconds), []);
    const cancel = useCallback(() => setCount(null), []);
    return {count, start, cancel};
};

export default useCountdown;
