import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const TimeSeriesChart = ({ data = { time: [], level: [], reference: [], error: [] } }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        // Initialize the chart instance only once
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);

            // Initial chart options with empty data
            chartInstance.current.setOption({
                animation: false,
                tooltip: {
                    trigger: 'axis',
                },
                xAxis: {
                    type: 'value',
                    splitLine: { show: true },
                    name: 'Time [s]',
                },
                yAxis: [
                    {
                        type: 'value',
                        splitLine: { show: true },
                        name: 'Level [m]',
                    },
                    {
                        type: 'value',
                        splitLine: { show: false },
                        name: 'Error [m*s]',
                        axisLine: {
                            show: true,
                            lineStyle: { color: '#fd8000' },
                        },
                    },
                ],
                series: [
                    {
                        id: 'levelSeries',
                        name: 'Level',
                        type: 'line',
                        data: [],
                        symbol: 'none', // Remove symbols here
                    },
                    {
                        id: 'referenceSeries',
                        name: 'Reference',
                        type: 'line',
                        data: [],
                        symbol: 'none', // Remove symbols here
                    },
                    {
                        id: 'errorSeries',
                        name: 'Error',
                        type: 'line',
                        data: [],
                        symbol: 'none', // Remove symbols here
                        yAxisIndex: 1,
                        itemStyle: { color: '#fd8000' },
                        lineStyle: { color: '#fd8000' },
                    },
                ],
            });
        }

        // Update chart data only if all arrays are present and have the same length
        if (
            Array.isArray(data.time) &&
            Array.isArray(data.level) &&
            Array.isArray(data.reference) &&
            Array.isArray(data.error) &&
            data.time.length === data.level.length &&
            data.time.length === data.reference.length &&
            data.time.length === data.error.length
        ) {
            const seriesData1 = data.time.map((time, index) => [time, parseFloat(data.level[index].toFixed(3))]);
            const seriesData2 = data.time.map((time, index) => [time, parseFloat(data.reference[index].toFixed(3))]);
            const seriesData3 = data.time.map((time, index) => [time, parseFloat(data.error[index].toFixed(3))]);

            chartInstance.current.setOption({
                series: [
                    {
                        id: 'levelSeries',
                        name: 'Level',
                        type: 'line',
                        data: seriesData1,
                        symbol: 'none', // Remove symbols here
                    },
                    {
                        id: 'referenceSeries',
                        name: 'Reference',
                        type: 'line',
                        data: seriesData2,
                        symbol: 'none', // Remove symbols here
                    },
                    {
                        id: 'errorSeries',
                        name: 'Error',
                        type: 'line',
                        data: seriesData3,
                        symbol: 'none', // Remove symbols here
                        yAxisIndex: 1,
                        itemStyle: { color: '#fd8000' },
                        lineStyle: { color: '#fd8000' },
                    },
                ],
            }, {
                replaceMerge: ['series']
            });
        }

        // Handle resizing
        const handleResize = () => {
            chartInstance.current && chartInstance.current.resize();
        };
        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartInstance.current) {
                chartInstance.current.dispose();
                chartInstance.current = null;
            }
        };
    }, [data]);

    return <div ref={chartRef} style={{ width: '100%', height: '600px', marginLeft: '-100px' }} />;
};

export default TimeSeriesChart;
