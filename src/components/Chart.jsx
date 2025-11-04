import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const clampToEqualLength = (a, b, c, d) => {
    const n = Math.min(a.length, b.length, c.length, d.length);
    return [a.slice(0, n), b.slice(0, n), c.slice(0, n), d.slice(0, n)];
};

const toPairs = (x, y) =>
    x.map((xi, i) => [Number(xi), Number.isFinite(+y[i]) ? Number(+y[i].toFixed?.(3) ?? +y[i]) : 0]);

/**
 * Props:
 *  - data: { time:number[], level:number[], reference:number[], error:number[] }
 *  - windowSec: number (default 100)
 *  - followLive: boolean (default true)
 *  - defaultVisibility: { level?: boolean, reference?: boolean, error?: boolean }
 */
const TimeSeriesChart = ({
                             data = { time: [], level: [], reference: [], error: [] },
                             windowSec = 100,
                             followLive = true,
                             defaultVisibility = { level: true, reference: true, error: true },
                         }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const resizeObsRef = useRef(null);

    // UI state for toggling series
    const [showLevel, setShowLevel] = useState(defaultVisibility.level ?? true);
    const [showReference, setShowReference] = useState(defaultVisibility.reference ?? true);
    const [showError, setShowError] = useState(defaultVisibility.error ?? true);

    // Init once
    useEffect(() => {
        if (!chartRef.current) return;

        chartInstance.current = echarts.init(chartRef.current, undefined, {
            renderer: 'canvas',
            devicePixelRatio: window.devicePixelRatio || 1,
        });

        chartInstance.current.setOption({
            animation: false,
            tooltip: { trigger: 'axis' },
            grid: { left: 56, right: 56, top: 32, bottom: 40 },
            xAxis: {
                type: 'value',
                splitLine: { show: true },
                name: 'Time [s]',
                nameGap: 22,
                min: 0,
                max: windowSec, // initial 0..windowSec window
            },
            yAxis: [
                {
                    type: 'value',
                    splitLine: { show: true },
                    name: 'Level [m]',
                    nameGap: 18,
                },
                {
                    type: 'value',
                    splitLine: { show: false },
                    name: 'Error [m·s]',
                    nameGap: 18,
                    axisLine: { show: true, lineStyle: { color: '#fd8000' } },
                },
            ],
            series: [
                { id: 'levelSeries', name: 'Level', type: 'line', data: [], symbol: 'none' },
                { id: 'referenceSeries', name: 'Reference', type: 'line', data: [], symbol: 'none' },
                {
                    id: 'errorSeries',
                    name: 'Error',
                    type: 'line',
                    data: [],
                    symbol: 'none',
                    yAxisIndex: 1,
                    itemStyle: { color: '#fd8000' },
                    lineStyle: { color: '#fd8000' },
                },
            ],
        });

        // Resize observer
        if ('ResizeObserver' in window) {
            resizeObsRef.current = new ResizeObserver(() => chartInstance.current?.resize());
            resizeObsRef.current.observe(chartRef.current);
        } else {
            const onWinResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', onWinResize);
            resizeObsRef.current = { disconnect: () => window.removeEventListener('resize', onWinResize) };
        }

        return () => {
            resizeObsRef.current?.disconnect?.();
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, [windowSec]);

    // Update data + moving x-axis window + visibility
    useEffect(() => {
        if (!chartInstance.current) return;

        const { time = [], level = [], reference = [], error = [] } = data || {};
        const [t, lev, ref, err] = clampToEqualLength(
            Array.isArray(time) ? time : [],
            Array.isArray(level) ? level : [],
            Array.isArray(reference) ? reference : [],
            Array.isArray(error) ? error : []
        );

        const seriesData1 = showLevel ? toPairs(t, lev) : [];
        const seriesData2 = showReference ? toPairs(t, ref) : [];
        const seriesData3 = showError ? toPairs(t, err) : [];

        // Sliding window
        const lastT = t.length ? Number(t[t.length - 1]) : 0;
        let xmin = 0;
        let xmax = windowSec;

        if (followLive) {
            if (lastT >= windowSec) {
                xmin = lastT - windowSec;
                xmax = lastT;
            } else {
                xmin = 0;
                xmax = windowSec;
            }
        } else {
            xmin = Math.min(0, ...t, 0);
            xmax = Math.max(windowSec, lastT, windowSec);
        }

        chartInstance.current.setOption(
            {
                xAxis: { min: xmin.toFixed(1), max: xmax },
                series: [
                    { id: 'levelSeries', data: seriesData1 },
                    { id: 'referenceSeries', data: seriesData2 },
                    { id: 'errorSeries', data: seriesData3 },
                ],
            },
            { notMerge: false, lazyUpdate: true, replaceMerge: ['series', 'xAxis'] }
        );
    }, [data, windowSec, followLive, showLevel, showReference, showError]);

    return (
        <div>
            {/* Simple toggle controls */}
            <div
                style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                }}
            >
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={showLevel}
                        onChange={(e) => setShowLevel(e.target.checked)}
                    />
                    Level
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={showReference}
                        onChange={(e) => setShowReference(e.target.checked)}
                    />
                    Reference
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={showError}
                        onChange={(e) => setShowError(e.target.checked)}
                    />
                    Error
                </label>
            </div>

            <div ref={chartRef} style={{ width: '100%', height: 600 }} />
        </div>
    );
};

export default TimeSeriesChart;
