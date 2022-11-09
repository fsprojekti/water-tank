module.exports.parameters = {
    tank: {
        //Tank parameters [m]
        height: 1,
        //Tank area [m^2]
        area: 0.1,
        //Tank max level [Px] on scheme
        offsetPx: 690,

    },
    simulation: {
        //Simulation step [s]
        step: 0.1,
    },
    intake: {
        //Water intake max[m³/s]
        flow_max: 0.0025,
    },
    drain: {
        //Valve constant
        valveConstant: 885.89,
    },
    evaluationManual: {
        duration: 120,
        referenceLevel: 0.75
    },
    evaluationMechanical: {
        duration: 60,
        referenceLevel: 0.75
    },
    render: {
        m2Px: 350,
        canvas: {
            width: 1400,
            height: 630,
        }
    },
    controller: {
        //construction [m]
        l1: 0.4,
        l2: 0.5,
        //[m]
        l3Limits: [0.5, 3],
        //[m]
        l4Limits: [0.5, 3],
        //[Px]
        axisYGovernorPositionPx: 197,
        //[Px]
        swingPointPx: [460, 80]
    },
    pontoon: {
        //[Px]
        heightPx: 50,
        //[Px]
        axisXPx: 930
    }
}
