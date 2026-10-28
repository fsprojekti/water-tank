import {buildTask, labTasks} from "./labConfig";

const config = {
    tank: {
        //Tank height [m]
        height: 1,
        //Tank area [m²]; smaller area makes the level react faster
        area: 0.025,
        //Tank bottom on scheme [Px]
        offsetPx: 628,
    },
    simulation: {
        //Simulation step [s]
        step: 0.1,
        //Gravitational acceleration [m/s²]
        gravity: 9.81,
        //Countdown before a run starts, so the student can get to the valve [s]
        countdownSeconds: 3,
    },
    intake: {
        //Water intake max [m³/s]
        flowMax: 0.0025,
        //Intake valve on the scheme: centre [Px], pipe width [Px]
        valveXPx: 316,
        valveYPx: 215,
        pipeWidthPx: 43,
        //Pipe end extended into the tank, length [Px]
        pipeExtensionPx: 30,
    },
    drain: {
        //Valve constant
        valveConstant: 885.89,
        //Outlet pipe under the tank: centre x [Px], pipe width [Px]
        xPx: 560,
        pipeWidthPx: 34,
    },
    consumers: {
        //Industrial consumers: on/off outlets with different pipe diameters [mm]
        list: [
            {name: "C1", diameterMm: 10, xPx: 720},
            {name: "C2", diameterMm: 12, xPx: 860},
            {name: "C3", diameterMm: 14, xPx: 1000},
            {name: "C4", diameterMm: 16, xPx: 1140},
            {name: "C5", diameterMm: 18, xPx: 1280},
        ],
        //Outlet discharge coefficient
        dischargeCoefficient: 0.6,
        //Share of their flow that consumers still draw when off (0 = closed)
        idleFlowRatio: 0,
        //Supply status: flow deviation from nominal (flow at reference level) for ok / warning, above is error
        tolerance: {ok: 0.01, warning: 0.03},
        //Switching pattern: "demand" follows a jumping total demand, "bursts" switches several consumers on
        //together for a short time, "independent" switches each consumer on its own
        pattern: "demand",
        //Demand: total demand as share of all consumers' capacity, how long it holds [s],
        //chance and length [s] of a short drop to zero
        demand: {range: [0.1, 0.9], holdSeconds: [2, 6], dropChance: 0.1, dropSeconds: [1, 3]},
        //Bursts: consumers switched together, burst length [s], quiet time between bursts [s],
        //random shift of each consumer's on and off [s]
        burst: {consumers: [2, 5], onSeconds: [3, 10], gapSeconds: [4, 12], jitterSeconds: 1},
        //Independent: random on/off durations [s]
        onSeconds: [5, 20],
        offSeconds: [5, 25],
        //Same seed gives every student the same disturbance; null for a new pattern on each reset
        seed: 2024,
        //Pipe width per diameter [Px/mm]
        pipePxPerMm: 1.4,
    },
    outlets: {
        //Outlet pipes under the tank [Px]
        pipeTopPx: 636,
        pipeBottomPx: 744,
        valveYPx: 690,
    },
    evaluation: {
        //title: page name; grade: task the page belongs to (pages without one are free to explore)
        //Duration [s], reference level [m]; metric picks the run summary and chart: "iae", "supply" or "plant"
        manual: {title: "Manual control", duration: 120, referenceLevel: 0.75, metric: "iae"},
        //controller "mechanical": the pontoon linkage drives the intake valve
        mechanical: {title: "Mechanical control", duration: 60, referenceLevel: 0.5, metric: "iae", controller: "mechanical"},
        //Grade 6 task: operator takes over a running plant and keeps consumers supplied
        operator: {
            duration: 120,
            referenceLevel: 0.75,
            metric: "supply",
            title: "Manual operator",
            grade: 6,
            //Run starts with the tank at this level [m]
            initialLevel: 0.75,
            //No continuous drain valve, consumers can't be disabled
            drainValve: false,
            lockConsumers: true,
            //Pass when running consumers were supplied (green or orange band) at least this share of their on time
            supplyTarget: 0.5,
        },
        //Grade 7 task: get to know the tank; fill and drain times, steady states
        tank: {
            duration: 120,
            //Target level for the fill / drain time [m]
            referenceLevel: 0.75,
            referenceLabel: "Target",
            metric: "plant",
            title: "Tank model",
            grade: 7,
            //No consumers, only the intake and the continuous drain valve
            consumers: false,
            //Start levels to choose from [m]
            startLevels: [0, 0.25, 0.5, 0.75, 1],
        },
        //Grade 9 task: gain and closing level chosen once must hold the reference while consumers draw water
        load: {
            duration: 120,
            //Default reference and the ones to choose from before the run [m]
            referenceLevel: 0.5,
            references: [0.5, 0.75],
            //Run starts with the level at the chosen reference
            startAtReference: true,
            metric: "load",
            title: "Mechanical load",
            grade: 9,
            controller: "mechanical",
            //Settings and reference can't change once the run started
            lockSettings: true,
            drainValve: false,
            lockConsumers: true,
            //Pass: mean level within this distance of the reference [m] and IAE below the limit per reference [m·s]
            pass: {meanTolerance: 0.02, iaeLimit: {0.5: 2.0, 0.75: 2.5}},
        },
        //Grade 10 task: a turbine driven by the level error moves the carriage, so h0 follows the error (integral)
        pi: {
            title: "Mechanical PI",
            grade: 10,
            duration: 120,
            referenceLevel: 0.5,
            references: [0.5, 0.75],
            startAtReference: true,
            metric: "pi",
            controller: "mechanical",
            integral: true,
            lockSettings: true,
            drainValve: false,
            lockConsumers: true,
            //Turbine: carriage speed per level error Ki, range and default [1/s]; screw pitch [m per turn].
            //Ki = unitGain · belt ratio (turbine pulley / carriage screw pulley), so equal pulleys at Ki = unitGain
            turbine: {gainLimits: [0.1, 3], gainInitial: 0.5, unitGain: 0.6, pitchM: 0.02},
            //Pass: integral action removes the offset, so a tighter mean and IAE than in grade 9
            pass: {meanTolerance: 0.01, iaeLimit: {0.5: 1.2, 0.75: 1.5}},
        },
        //Grade 8 task: gain and closing level set the steady level and the speed of the mechanical controller
        tuning: {
            duration: 60,
            //Not a task target; h0 sets where the level settles
            referenceLevel: 0.5,
            showReference: false,
            metric: "tuning",
            title: "Mechanical tuning",
            grade: 8,
            controller: "mechanical",
            //Drain closed, no consumers
            drainValve: false,
            consumers: false,
        },
    },
    render: {
        //Scheme overlays use scheme coordinates [Px] (origin at top left of the scheme image)
        m2Px: 350,
        //Part of the scheme shown [Px]: the intake pipe comes in from the left edge
        viewPx: {left: 220, right: 1470},
        //Valve panels under the intake and drain valves [Px]
        valvePanel: {leftPx: 226, widthPx: 180, intakeTopPx: 300, heightPx: 90},
    },
    controller: {
        //Mechanical P controller: rack on the pontoon, pinion on a carriage, belt to the intake valve.
        //Gain kp: valve opening per metre of level below h0 [1/m]; h0: level where the valve closes,
        //set by the carriage height [m]
        kpLimits: [1, 10],
        kpInitial: 2,
        h0Limits: [0.1, 1],
        h0Initial: 0.4,
        //Pinion radius [m]; with it the belt ratio follows from kp
        pinionRadiusM: 0.1,
        //Fixed open-belt reduction: half a turn at the input gives the valve's quarter turn.
        //Pulley radii [m], no student adjustment; the Kp belt calculation includes this stage.
        valveDrive: {drivingRadiusM: 0.04, drivenRadiusM: 0.08},
    },
    pontoon: {
        //[Px]
        widthPx: 250,
        heightPx: 50,
        axisXPx: 760,
    },
};

for (const task of [...labTasks, buildTask]) {
    config.evaluation[task.mode] = {title: task.title, grade: task.grade, lab: true, lockSettings: true, ...task.evaluation};
}

export default config;
