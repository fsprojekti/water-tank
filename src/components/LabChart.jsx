import {useEffect, useRef, useState} from "react";
import * as echarts from "echarts/core";
import {LineChart} from "echarts/charts";
import {DataZoomComponent, GraphicComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent,
    ToolboxComponent, TooltipComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
import config from "../config";
import {drainScenarios} from "../labConfig";
import useAvailableSize from "./useAvailableSize";

echarts.use([LineChart, DataZoomComponent, GraphicComponent, GridComponent, LegendComponent, MarkAreaComponent,
    MarkLineComponent, ToolboxComponent, TooltipComponent, CanvasRenderer]);

const line = (name, data, color, extra = {}) => ({name, data, type: "line", symbol: "none", lineStyle: {width: 2},
    itemStyle: {color}, ...extra});

const isIntegral = (task) => task.controller === "integral" || task.controller === "parallelPI";

//Zoom and pan: wheel zooms time, Shift+wheel the value axis of the grid under the pointer, dragging pans both
const zoomIds = ["time", "timeSlider", "level", "lower"];
const fitAll = (chart) => chart.dispatchAction({type: "dataZoom",
    batch: zoomIds.map((dataZoomId) => ({dataZoomId, start: 0, end: 100}))});

//Magnifier with a frame around it, for the fit button
const fitIcon = "path://M2,2H9V4H4V9H2ZM23,2H30V9H28V4H23ZM2,23H4V28H9V30H2ZM28,23H30V30H23V28H28Z";

//Dashed guide lines that follow the pointer on both axes, also before any data exists
//Only the time line drives the tooltip; the value line just reads the axis.
const guide = (label, triggerTooltip = false) => ({show: true, type: "line", snap: false, triggerTooltip,
    label: {show: true, ...label}, lineStyle: {color: "#495057", width: 1, type: "dashed"}});

//Drawn lines (e.g. tangents) on the level grid: a straight line through an anchor point and a direction point
const lineColor = "#8e3fa8";
const lineIcon = "path://M4,28L28,4M2,26A4,4,0,1,0,2.01,26";
const clearIcon = "path://M6,10H26M11,10V27H21V10M13,6H19M14,14V23M18,14V23";
const levelGrid = {gridIndex: 0};
//Snap the anchor to the level curve when it is this close to it [px]
const snapPx = 10;

//Ends of the line across the whole run, with the anchor in between; the level axis clips it to 0–1 m
const linePoints = ([t0, h0], [t1, h1], duration) => {
    if (Math.abs(t1 - t0) < 1e-9) return [[t0, 0], [t0, h0], [t0, 1]];
    const slope = (h1 - h0) / (t1 - t0);
    return [[0, h0 - slope * t0], [t0, h0], [duration, h0 + slope * (duration - t0)]];
};

const lineSeries = (a, b, duration, preview) => ({
    type: "line", xAxisIndex: 0, yAxisIndex: 0, silent: true, tooltip: {show: false}, z: 4,
    data: linePoints(a, b, duration).map((p, i) => (i === 1 ? {value: p, symbol: "circle", symbolSize: 7} : p)),
    symbol: "none", lineStyle: {color: lineColor, width: 1.5, type: preview ? "dashed" : "solid"},
    itemStyle: {color: lineColor},
});

//Static layout for a task: axes, grids, crosshair, zoom controls and toolbox
const layoutOption = (task, chart, actions) => {
    const integral = isIntegral(task);
    return {
        animation: false,
        tooltip: {trigger: "axis", axisPointer: {type: "line", snap: false},
            valueFormatter: (v) => Number(v).toFixed(integral ? 3 : 5)},
        axisPointer: {link: [{xAxisIndex: "all"}]},
        legend: {top: 30, textStyle: {fontSize: 11}},
        toolbox: {right: 20, top: 4, itemSize: 16, feature: {
            dataZoom: {title: {zoom: "Povečaj izbrano območje", back: "Korak nazaj"}},
            myFit: {show: true, title: "Prikaži vse (ali dvoklik)", icon: fitIcon, onclick: () => fitAll(chart)},
            myLine: {show: true, title: "Nariši premico (tangento)", icon: lineIcon, onclick: () => actions.current.toggleLine()},
            myClear: {show: true, title: "Pobriši premice", icon: clearIcon, onclick: () => actions.current.clearLines()},
            saveAsImage: {title: "Shrani sliko", name: `ocena-${task.grade}`, backgroundColor: "#ffffff", pixelRatio: 2},
        }},
        grid: [{top: 100, left: 62, right: 25, height: "36%"}, {top: "66%", left: 62, right: 25, bottom: 72}],
        xAxis: [0, 1].map((gridIndex) => ({type: "value", gridIndex, min: 0, max: task.duration,
            name: gridIndex ? "Čas [s]" : "", nameLocation: "middle", nameGap: 26,
            //Zoomed axes end at arbitrary times; keep their end labels short
            axisLabel: {formatter: (value) => String(Number(value.toFixed(1)))},
            axisPointer: guide({formatter: ({value}) => `${value.toFixed(1)} s`}, true)})),
        yAxis: [{type: "value", name: "Nivo [m]", nameTextStyle: {align: "left"}, min: 0, max: 1,
            axisPointer: guide({formatter: ({value}) => `${value.toFixed(3)} m`})},
        {type: "value", gridIndex: 1, name: integral ? "Odprtje / prispevki [%]" : "Pretok [m³/s]", nameTextStyle: {align: "left"},
            axisPointer: guide({precision: integral ? 1 : 5})}],
        dataZoom: [
            {id: "time", type: "inside", xAxisIndex: [0, 1], filterMode: "none"},
            {id: "timeSlider", type: "slider", xAxisIndex: [0, 1], filterMode: "none", bottom: 8, height: 18,
                labelFormatter: (value) => `${value.toFixed(0)} s`},
            {id: "level", type: "inside", yAxisIndex: 0, filterMode: "none", zoomOnMouseWheel: "shift"},
            {id: "lower", type: "inside", yAxisIndex: 1, filterMode: "none", zoomOnMouseWheel: "shift"},
        ],
    };
};

const LabChart = ({model}) => {
    const ref = useRef(null);
    const chart = useRef(null);
    const {height} = useAvailableSize(ref);
    //Line tool: off, waiting for the anchor click, or rotating around the anchor until the second click
    const [drawing, setDrawing] = useState(false);
    const [pending, setPending] = useState(null);
    const [lines, setLines] = useState([]);
    //Toolbox buttons; state setters are stable, so these never go stale
    const actions = useRef({
        toggleLine: () => { setDrawing((active) => !active); setPending(null); },
        clearLines: () => { setLines([]); setDrawing(false); setPending(null); },
    });
    //Latest values for the chart's event handlers
    const live = useRef({});
    useEffect(() => { live.current = {model, drawing, pending}; });

    useEffect(() => {
        chart.current = echarts.init(ref.current);
        const fit = () => fitAll(chart.current);
        chart.current.getZr().on("dblclick", fit);
        const levelPoint = (event) => chart.current.convertFromPixel(levelGrid, [event.offsetX, event.offsetY]);
        //Anchor on the nearest point of the level curve if the click is close to it
        const snapToLevel = (event, point) => {
            let best = point, distance = snapPx;
            for (const sample of live.current.model.history.level) {
                const [x, y] = chart.current.convertToPixel(levelGrid, sample);
                const d = Math.hypot(x - event.offsetX, y - event.offsetY);
                if (d < distance) [best, distance] = [sample, d];
            }
            return best;
        };
        chart.current.getZr().on("click", (event) => {
            const {drawing: active, pending: started} = live.current;
            if (!active || !chart.current.containPixel(levelGrid, [event.offsetX, event.offsetY])) return;
            const point = levelPoint(event);
            if (!started) {
                const anchor = snapToLevel(event, point);
                setPending({a: anchor, b: anchor});
                return;
            }
            //The second click of a double click lands on the anchor and has no direction
            const [x, y] = chart.current.convertToPixel(levelGrid, started.a);
            if (Math.hypot(x - event.offsetX, y - event.offsetY) < 6) return;
            setLines((list) => [...list, {a: started.a, b: point}]);
            setPending(null);
            setDrawing(false);
        });
        chart.current.getZr().on("mousemove", (event) => {
            const {pending: started} = live.current;
            if (started) setPending({a: started.a, b: levelPoint(event)});
        });
        const observer = new ResizeObserver(() => chart.current?.resize());
        observer.observe(ref.current);
        return () => { observer.disconnect(); chart.current.dispose(); chart.current = null; };
    }, []);
    useEffect(() => {
        chart.current.setOption(layoutOption(config.evaluation[model.mode], chart.current, actions), true);
    }, [model.mode]);
    //Escape cancels the line being drawn
    useEffect(() => {
        if (!drawing) return undefined;
        const cancel = (event) => { if (event.key === "Escape") { setDrawing(false); setPending(null); } };
        window.addEventListener("keydown", cancel);
        return () => window.removeEventListener("keydown", cancel);
    }, [drawing]);
    //Highlight the line button and show what to click next
    useEffect(() => {
        chart.current.setOption({
            toolbox: {feature: {myLine: {iconStyle: {borderColor: drawing ? lineColor : "#666"}}}},
            graphic: [{id: "lineHint", type: "text", left: 70, top: 104, ignore: !drawing, z: 10, style: {
                text: pending ? "Premakni miško za smer, klikni za potrditev · Esc prekliče"
                    : "Klikni točko na grafu nivoja · Esc prekliče",
                fill: lineColor, fontSize: 12, backgroundColor: "rgba(255,255,255,.85)", padding: [2, 4]}}],
        });
    }, [drawing, pending]);
    //Only the series change while running, so the student's zoom and pan stay put
    useEffect(() => {
        const task = config.evaluation[model.mode];
        const integral = isIntegral(task);
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
        const drawn = [...lines.map(({a, b}) => lineSeries(a, b, task.duration, false)),
            ...(pending ? [lineSeries(pending.a, pending.b, task.duration, true)] : [])];
        chart.current.setOption({legend: {data: series.map(({name}) => name)}, series: [...series, ...drawn]},
            {replaceMerge: ["series"]});
    }, [model, lines, pending]);
    return <div className="lab-chart" style={{height: Math.max(480, height)}} ref={ref}
                role="img" aria-label="Graf nivoja in odziva regulatorja skozi čas"/>;
};

export default LabChart;
