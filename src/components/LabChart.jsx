import {useEffect, useRef} from "react";
import * as echarts from "echarts/core";
import {LineChart} from "echarts/charts";
import {GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
import config from "../config";
import {drainScenarios} from "../labConfig";
import useAvailableSize from "./useAvailableSize";

echarts.use([LineChart, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const line = (name, data, color, extra = {}) => ({name, data, type: "line", symbol: "none", lineStyle: {width: 2},
    itemStyle: {color}, ...extra});

const LabChart = ({model}) => {
    const ref = useRef(null);
    const chart = useRef(null);
    const {height} = useAvailableSize(ref);
    useEffect(() => {
        chart.current = echarts.init(ref.current);
        const observer = new ResizeObserver(() => chart.current?.resize());
        observer.observe(ref.current);
        return () => { observer.disconnect(); chart.current.dispose(); chart.current = null; };
    }, []);
    useEffect(() => {
        const task = config.evaluation[model.mode];
        const integral = task.controller === "integral" || task.controller === "parallelPI";
        const scenario = drainScenarios.find(({id}) => id === model.scenario);
        const band = task.grade === 6 ? [model.referenceLevel * (1 - config.consumers.tolerance.warning) ** 2,
            model.referenceLevel * (1 + config.consumers.tolerance.warning) ** 2] : null;
        const lower = {xAxisIndex: 1, yAxisIndex: 1};
        const series = [
            line("Nivo", model.history.level, "#2879a7", {
                markArea: band ? {silent: true, data: [[{yAxis: band[0], itemStyle: {color: "rgba(43,151,109,.13)"}}, {yAxis: band[1]}]]} : undefined,
                markLine: task.research && scenario.at ? {symbol: "none", silent: true,
                    data: [{xAxis: scenario.at, label: {formatter: "Skok odtoka"}}]} : undefined,
            }),
            line("Želeni nivo", [[0, model.referenceLevel], [task.duration, model.referenceLevel]], "#db8530",
                {lineStyle: {type: "dashed", width: 1.5}}),
            ...(integral ? [
                ...(task.controller === "parallelPI" ? [line("Prispevek P", model.history.controlP, "#9b68b3", lower)] : []),
                line("Prispevek I", model.history.controlI, "#168b83", lower),
                line("Ventil · omejen 0–100 %", model.history.valve, "#34475b", lower),
                line("Odtočni ventil", model.history.drainValve, "#c36254",
                    {...lower, step: "end", lineStyle: {width: 1.5, type: "dashed"}}),
            ] : [line("Dotok", model.history.flowIn, "#279667", lower),
                line("Odtok skupaj", model.history.drain.map(([t, v], i) => [t, (v + (model.history.consumers[i]?.[1] ?? 0))]), "#c36254", lower)]),
        ];
        chart.current.setOption({animation: false, tooltip: {trigger: "axis", valueFormatter: (v) => Number(v).toFixed(integral ? 3 : 5)},
            legend: {top: 8, textStyle: {fontSize: 11}},
            grid: [{top: 75, left: 62, right: 25, height: "42%"}, {top: "68%", left: 62, right: 25, bottom: 42}],
            xAxis: [0, 1].map((gridIndex) => ({type: "value", gridIndex, min: 0, max: task.duration,
                name: gridIndex ? "Čas [s]" : "", nameLocation: "middle", nameGap: 26})),
            yAxis: [{type: "value", name: "Nivo [m]", min: 0, max: 1},
                {type: "value", gridIndex: 1, name: integral ? "Odprtje / prispevki [%]" : "Pretok [m³/s]"}],
            series,
        }, true);
    }, [model]);
    return <div className="lab-chart" style={{height: Math.max(480, height)}} ref={ref}
                role="img" aria-label="Graf nivoja in odziva regulatorja skozi čas"/>;
};

export default LabChart;
