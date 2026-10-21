import {useEffect, useRef} from "react";
import useAvailableSize from "./useAvailableSize";
import {targetReachedAt, timeConstant} from "../simulation/measurements";
import * as echarts from "echarts/core";
import {LineChart} from "echarts/charts";
import {GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
import config from "../config";

echarts.use([LineChart, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent,
    CanvasRenderer]);

const colors = {
    level: "#4283b2",
    reference: "#fd8000",
    error: "#8e44ad",
    intake: "#3aa73f",
    drain: "#1c6693",
    consumers: "#d54436",
    setLevel: "#00897b",
};

const minHeightPx = 480;

const line = (id, name, color, extra = {}) => ({
    id, name, type: "line", symbol: "none", data: [],
    itemStyle: {color}, lineStyle: {color}, ...extra,
});

const common = {
    animation: false,
    legend: {},
    tooltip: {
        trigger: "axis",
        valueFormatter: (value) => (Math.abs(value) < 0.05 ? value.toFixed(5) : value.toFixed(3)),
    },
    axisPointer: {link: [{xAxisIndex: "all"}]},
    //Grids scale with the chart height
    grid: [
        {top: 50, bottom: "46%", left: 60, right: 60},
        {top: "66%", bottom: 50, left: 60, right: 60},
    ],
    xAxis: [
        {type: "value", min: 0, gridIndex: 0},
        {type: "value", min: 0, gridIndex: 1, name: "Time [s]", nameLocation: "middle", nameGap: 26},
    ],
};

const levelSeries = [
    line("level", "Level", colors.level),
    line("reference", "Reference", colors.reference, {lineStyle: {color: colors.reference, type: "dashed"}}),
];

//Flow series in the lower grid, on y axis flowAxis
const flowSeries = (flowAxis, showDrain, showConsumers) => [
    line("flowIn", "Intake", colors.intake, {xAxisIndex: 1, yAxisIndex: flowAxis}),
    ...(showDrain ? [line("drain", "Drain", colors.drain, {xAxisIndex: 1, yAxisIndex: flowAxis})] : []),
    ...(showConsumers ? [line("consumers", "Consumers", colors.consumers, {xAxisIndex: 1, yAxisIndex: flowAxis})] : []),
];

//Level and reference with the integral of absolute error on top, flows below
const iaeOption = (showDrain, showConsumers) => ({
    ...common,
    yAxis: [
        {type: "value", gridIndex: 0, name: "Level [m]"},
        {
            type: "value", gridIndex: 0, name: "IAE [m·s]",
            splitLine: {show: false},
            axisLine: {show: true, lineStyle: {color: colors.error}},
        },
        {type: "value", gridIndex: 1, name: "Flow [m³/s]"},
    ],
    series: [
        ...levelSeries,
        line("error", "IAE", colors.error, {yAxisIndex: 1}),
        ...flowSeries(2, showDrain, showConsumers),
    ],
});

//Level and target on top with a mark when the target is reached, flows below
const plantOption = (showDrain, showConsumers) => ({
    ...common,
    yAxis: [
        {type: "value", gridIndex: 0, name: "Level [m]", min: 0, max: config.tank.height},
        {type: "value", gridIndex: 1, name: "Flow [m³/s]"},
    ],
    series: [
        line("level", "Level", colors.level, {
            markLine: {
                silent: true,
                symbol: "none",
                lineStyle: {color: colors.reference, type: "solid", width: 1},
                label: {formatter: ({value}) => `${value.toFixed(1)} s`, color: colors.reference},
                data: [],
            },
        }),
        line("reference", "Target", colors.reference, {lineStyle: {color: colors.reference, type: "dashed"}}),
        ...flowSeries(1, showDrain, showConsumers),
    ],
});

//Level with marks for the steady level and the time constant once settled, intake flow below
const tuningOption = () => ({
    ...common,
    yAxis: [
        {type: "value", gridIndex: 0, name: "Level [m]", min: 0, max: config.tank.height},
        {type: "value", gridIndex: 1, name: "Flow [m³/s]"},
    ],
    series: [
        line("level", "Level", colors.level, {
            markLine: {
                silent: true,
                symbol: "none",
                lineStyle: {color: colors.reference, type: "dashed", width: 1},
                data: [],
            },
        }),
        ...flowSeries(1, false, false),
    ],
});

//As iae, with the closing level h0 moved by the turbine next to the flows
const piOption = (showDrain, showConsumers) => {
    const option = iaeOption(showDrain, showConsumers);
    return {
        ...option,
        yAxis: [
            ...option.yAxis,
            {
                type: "value", gridIndex: 1, name: "h0 [m]",
                splitLine: {show: false},
                axisLine: {show: true, lineStyle: {color: colors.setLevel}},
            },
        ],
        series: [...option.series, line("setLevel", "h0", colors.setLevel, {xAxisIndex: 1, yAxisIndex: 3})],
    };
};

const options = {
    pi: (reference, showDrain, showConsumers) => piOption(showDrain, showConsumers),
    load: (reference, showDrain, showConsumers) => iaeOption(showDrain, showConsumers),
    tuning: () => tuningOption(),
    iae: (reference, showDrain, showConsumers) => iaeOption(showDrain, showConsumers),
    supply: (reference) => errorOption(reference),
    plant: (reference, showDrain, showConsumers) => plantOption(showDrain, showConsumers),
};

//Level error band [m] where consumers get their nominal flow within a flow tolerance d: flow follows √h,
//so the level must stay within reference·(1 ± d)²
const errorBand = (reference, tolerance) =>
    [reference - reference * (1 + tolerance) ** 2, reference - reference * (1 - tolerance) ** 2];

//Error far outside any band, for the red zones [m]
const farErrorPx = 10;

//Level and reference on top, level error below with the green, orange and red supply zones
const errorOption = (reference) => {
    const {ok, warning} = config.consumers.tolerance;
    const green = errorBand(reference, ok);
    const orange = errorBand(reference, warning);
    const zone = (from, to, color, name) => [{yAxis: from, itemStyle: {color}, name}, {yAxis: to}];
    return {
        ...common,
        yAxis: [
            {type: "value", gridIndex: 0, name: "Level [m]"},
            //Fixed range so the zones stay put while the operator watches; larger errors are red anyway
            {type: "value", gridIndex: 1, name: "Error [m]", min: -0.1, max: 0.1},
        ],
        series: [
            ...levelSeries,
            line("deviation", "Error", colors.error, {
                xAxisIndex: 1,
                yAxisIndex: 1,
                markArea: {
                    silent: true,
                    label: {show: false},
                    data: [
                        zone(-farErrorPx, orange[0], "rgba(220, 53, 69, 0.15)", "red"),
                        zone(orange[1], farErrorPx, "rgba(220, 53, 69, 0.15)", "red"),
                        zone(orange[0], green[0], "rgba(240, 173, 78, 0.3)", "orange"),
                        zone(green[1], orange[1], "rgba(240, 173, 78, 0.3)", "orange"),
                        zone(green[0], green[1], "rgba(58, 167, 63, 0.35)", "green"),
                    ],
                },
                markLine: {
                    silent: true,
                    symbol: "none",
                    label: {show: false},
                    lineStyle: {color: "#6c757d", type: "solid", width: 1},
                    data: [{yAxis: 0}],
                },
            }),
        ],
    };
};

/**
 * Run chart; history series are [time, value] pairs.
 * metric "iae" shows the IAE and flows, metric "supply" shows the level error against the green band.
 */
const Chart = ({history, reference, duration, metric = "iae", showDrain = true, showConsumers = true}) => {
    const chartRef = useRef(null);
    const chart = useRef(null);
    //Fill the window height next to the scheme; when stacked under it, keep a usable height
    const {height} = useAvailableSize(chartRef);

    useEffect(() => {
        const instance = echarts.init(chartRef.current);
        instance.setOption(options[metric](reference, showDrain, showConsumers));
        chart.current = instance;

        //Follow the container size (window resize, side by side or stacked layout)
        const observer = new ResizeObserver(() => instance.resize());
        observer.observe(chartRef.current);
        return () => {
            observer.disconnect();
            instance.dispose();
            chart.current = null;
        };
    }, [metric, reference, showDrain, showConsumers]);

    useEffect(() => {
        const levels = [
            {id: "level", data: history.level},
            {id: "reference", data: [[0, reference], [duration, reference]]},
        ];
        const flows = [
            {id: "flowIn", data: history.flowIn},
            ...(showDrain ? [{id: "drain", data: history.drain}] : []),
            ...(showConsumers ? [{id: "consumers", data: history.consumers}] : []),
        ];
        const reached = metric === "plant" ? targetReachedAt(history.level, reference) : null;
        const response = metric === "tuning" ? timeConstant(history.level) : null;
        const series = {
            pi: () => [...levels, {id: "error", data: history.error}, ...flows, {id: "setLevel", data: history.setLevel}],
            load: () => [...levels, {id: "error", data: history.error}, ...flows],
            tuning: () => [
                {
                    id: "level",
                    data: history.level,
                    markLine: {
                        data: response === null ? [] : [
                            {
                                yAxis: response.steady.level,
                                label: {position: "insideEndTop", formatter: `steady ${response.steady.level.toFixed(3)} m`},
                            },
                            {xAxis: response.t63, label: {formatter: `τ = ${response.t63.toFixed(1)} s`}},
                        ],
                    },
                },
                ...flows,
            ],
            iae: () => [...levels, {id: "error", data: history.error}, ...flows],
            supply: () => [...levels, {id: "deviation", data: history.deviation}],
            plant: () => [
                {...levels[0], markLine: {data: reached === null ? [] : [{xAxis: reached}]}},
                levels[1],
                ...flows,
            ],
        };
        chart.current.setOption({
            xAxis: [{max: duration}, {max: duration}],
            series: series[metric](),
        });
    }, [history, reference, duration, metric, showDrain, showConsumers]);

    return <div ref={chartRef} style={{width: "100%", height: Math.max(minHeightPx, height)}}/>;
};

export default Chart;
