import React, {useEffect, useRef, useState} from 'react';
import * as echarts from 'echarts';

const TimeSeriesChart = ({data}) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        // Initialize the chart
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
        }

        const seriesData1 = data.time.map((time, index) => [time, parseFloat(data.level[index].toFixed(3))]);
        const seriesData2 = data.time.map((time, index) => [time, parseFloat(data.reference[index].toFixed(3))]);
        const seriesData3 = data.time.map((time, index) => [time, parseFloat(data.error[index].toFixed(3))]);


        // Configure the chart options
        const options = {
            animation: false,
            tooltip: {
                trigger: 'axis'
            },
            xAxis: {
                type: 'value',
                splitLine: {
                    show: true
                },
                name: 'Time [s]'
            },
            yAxis: [
                {
                    type: 'value',
                    splitLine: {
                        show: true
                    },
                    name: 'Level [m]'
                },
                {
                    type: 'value',
                    splitLine: {
                        show: false
                    },
                    name: 'Error [m*s]',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: "#fd8000"
                        }
                    },
                }],

            series: [
                {
                    name: 'Level',
                    type: 'line',
                    data: seriesData1,
                },
                {
                    name: 'Reference',
                    type: 'line',
                    data: seriesData2,
                },
                {
                    name: 'Error',
                    type: 'line',
                    data: seriesData3,
                    yAxisIndex: 1,
                    itemStyle: {
                        color: "#fd8000"
                    },
                    lineStyle: {
                        color: "#fd8000"
                    }
                }
            ]
        };

        // Set the options
        chartInstance.current.setOption(options);

        return () => {
            // if (chartInstance.current) {
            //     chartInstance.current.dispose();
            // }
        };
    }, [data]);

    return <div ref={chartRef} style={{width: '100%', height: '600px', marginTop: '-25px', marginLeft: "-100px"}}/>;
};

export default TimeSeriesChart;
