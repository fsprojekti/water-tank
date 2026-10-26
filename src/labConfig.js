//Runtime modes and controls. Student instructions are maintained separately in Moodle.
export const labTasks = [
    {
        grade: 6, mode: "labManual", title: "Ročna regulacija", short: "Ročno",
        evaluation: {duration: 120, referenceLevel: 0.75, initialLevel: 0.75, consumers: false,
            drainValve: true, randomDrain: true, supplyTarget: 0.5, metric: "supply"},
    },
    {
        grade: 7, mode: "labP", title: "Odziv P-regulatorja", short: "Odziv P",
        evaluation: {duration: 60, referenceLevel: 0.5, initialLevel: 0.2, consumers: false,
            drainValve: true, controller: "mechanical", h0Initial: 0.65, metric: "iae", research: true},
    },
    {
        grade: 8, mode: "labPLoad", title: "P-regulator pod obremenitvijo", short: "P · obremenitev",
        evaluation: {duration: 90, referenceLevel: 0.5, initialLevel: 0.5, consumers: false,
            drainValve: true, controller: "mechanical", h0Initial: 0.65, metric: "iae", research: true},
    },
    {
        grade: 9, mode: "labI", title: "I-regulator", short: "Samo I",
        evaluation: {duration: 90, referenceLevel: 0.5, initialLevel: 0.35, consumers: false,
            drainValve: true, controller: "integral", metric: "iae", research: true},
    },
    {
        grade: 10, mode: "labPI", title: "PI-regulator", short: "PI",
        evaluation: {duration: 120, referenceLevel: 0.5, initialLevel: 0.5, consumers: false,
            drainValve: true, randomDrain: true, controller: "parallelPI", metric: "iae",
            pass: {iaeLimit: 1.5, meanTolerance: 0.01}},
    },
];

export const drainScenarios = [
    {id: "low", label: "Majhen · 12 %", opening: 12},
    {id: "medium", label: "Srednji · 24 %", opening: 24},
    {id: "high", label: "Velik · 36 %", opening: 36},
    {id: "step", label: "Skok pri 30 s · 12 → 36 %", opening: 12, after: 36, at: 30},
    {id: "random", label: "Naključno · 12–36 %"},
];

export const labSettings = {kiLimits: [0.05, 3], kiInitial: 0.5, integralInitial: 0.34, seed: 2024};

//One physical drain in every student mode. Fixed seed makes controller comparisons fair.
export const labDrain = {openings: [12, 18, 24, 30, 36], initialOpening: 24,
    initialSeconds: 12, holdSeconds: [8, 14], settlingSeconds: 30};

//Fixed hydraulic drive calibration. Direct drive: normalized valve rate per error [1/(m·s)].
//Carriage drive: carriage speed per error [1/s], with lead-screw pitch [m/revolution].
export const labMechanics = {valveUnitGain: 0.6, carriageUnitGain: 0.6, screwPitch: 0.02};
