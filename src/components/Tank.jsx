import React, { useMemo } from 'react';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const toNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

/**
 * Tank
 * Props:
 *  - flow: % (0..100)
 *  - level: % (0..100)
 *  - heightPx: number (tank pixel height)
 *  - offsetPx: number (top offset anchor)
 *  - leftBase: number (base left for the tank body)         [default 505]
 *  - leftOverflowTop: number (left for overflow top box)    [default 1420]
 *  - leftOverflowDown: number (left for overflow down box)  [default 1450]
 *  - leftFlow: number (left for the intake/outlet column)   [default 590]
 */
const Tank = ({
                       flow = 0,
                       level = 0,
                       heightPx = 0,
                       offsetPx = 100,
                       leftBase = 465,
                       leftOverflowTop = 1388,
                       leftOverflowDown = 1418,
                       leftFlow = 550,
                   }) => {
    const FLOW_MAX_PX = 43;
    const hPx = Math.max(0, toNumber(heightPx));

    const { flowPx, levelPx, overflowVis } = useMemo(() => {
        const flowPct = clamp(toNumber(flow), 0, 100);
        const levelPct = clamp(toNumber(level), 0, 100);

        const _flowPx = clamp((flowPct / 100) * FLOW_MAX_PX, 0, FLOW_MAX_PX);
        const _levelPx = clamp((levelPct / 100) * hPx, 0, hPx);
        const _overflowVis = _levelPx >= hPx ? 'visible' : 'hidden';

        return { flowPx: _flowPx, levelPx: _levelPx, overflowVis: _overflowVis };
    }, [flow, level, hPx]);

    const topLiquid = toNumber(offsetPx) - levelPx;

    // Memoize styles to avoid new objects on every render
    const styles = useMemo(
        () => ({
            mainLiquid: {
                position: 'absolute',
                top: topLiquid,
                left: leftBase,
                backgroundColor: '#3aa73f',
                width: 923,
                height: levelPx,
            },
            overflowTop: {
                visibility: overflowVis,
                position: 'absolute',
                top: topLiquid,
                left: leftOverflowTop,
                backgroundColor: '#3aa73f',
                width: 60,
                height: 20,
            },
            overflowDown: {
                visibility: overflowVis,
                position: 'absolute',
                top: topLiquid + 20,
                left: leftOverflowDown,
                backgroundColor: '#3aa73f',
                width: 30,
                height: Math.max(0, hPx - 10),
            },
            flowColumn: {
                position: 'absolute',
                top: Math.max(0, hPx - 89),
                left: leftFlow,
                backgroundColor: '#3aa73f',
                width: flowPx,
                height: hPx + 17,
            },
        }),
        [topLiquid, leftBase, overflowVis, leftOverflowTop, leftOverflowDown, hPx, leftFlow, flowPx, levelPx]
    );

    return (
        <div>
            <div style={styles.mainLiquid} />
            <div style={styles.overflowTop} />
            <div style={styles.overflowDown} />
            <div style={styles.flowColumn} />
        </div>
    );
};

// shallow prop memoization (re-render only if props change)
export default React.memo(Tank);
