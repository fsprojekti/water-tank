module.exports.parameters = {
    tank: {
        //Tank parameters [m]
        height: 1,
        //Tank area [m^2]
        area: 0.1,
    },
    simulation:{
        //Simulation step [s]
        step: 0.01,
    },
    intake:{
        //Water intake max[m³/s]
        flow_max: 0.0025,
    },
    drain:{
        //Valve constant
        valveConstant: 885.89,
    },
    evaluationManual:{
        duration:60,
        referenceLevel:0.75
    },
    evaluationMechanical:{
        duration:60,
        referenceLevel:0.75
    },
    render:{
        m2Px:350,
        tankBottomLevelPx:690
    },
    controller:{
        //[m]
        swingRodLength:1.5,
        //[m]
        pontoonRodLimits:[0.5, 1.5],
        //[Px]
        axisYGovernorPositionPx:197,
        //Limits governor vertical movements [Px]
        governorLimitsPx:[110, 190],
    },
    pontoon:{
        //[Px]
        height: 50,
        //[Px]
        axisXPx:930
    },
    pivot:{
        //Horizontal axis position of pivot point[Px]
        axisPx:100,
        //Limit movement on horizontal axis
        limitsPx:[350, 750]
    }
}
