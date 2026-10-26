# Water tank

Interactive water tank level control simulation for the MKTP laboratory. Built with React and Vite.

## Student workbench

The home page opens `#/vaja/6`: one Slovenian interface with five tabs and a shared tank model.

| Tab | Mode |
| --- | --- |
| 6 | Manual regulation with one randomly opening drain, 120 seconds |
| 7 | P response: adjustable Kp and closing level h0 under constant drain, 60 seconds |
| 8 | P under load: three drains and a drain step at 30 seconds, 90 seconds |
| 9 | Independent I-only controller with adjustable Ki, 90 seconds |
| 10 | Parallel PI with the same randomly opening drain, 120 seconds |

The page contains the plant diagram, controls, plots and live measurements. Assignments, explanations,
assessment instructions and student reporting are separate Moodle material; they are not part of this app.

Research runs support 1×, 2× and 4× speed without changing the numerical time step. Controller settings and
drain scenarios are locked until **Nov poskus**. Leaving a tab pauses its simulation; the model remains in memory.
Live runs reset on a page reload. There is no notebook, submission flow or automatic grade in the interface.

Runtime modes and drain scenarios are in `src/labConfig.js`. I and PI use normalized valve opening:
`u = clamp(Kp*e + I, 0, 1)`, `dI/dt = Ki*e`, with conditional integration at actuator limits.
I-only omits P entirely. Kp is in 1/m and Ki in 1/(m·s), independently adjustable; initial I is 0.34.
Both use the mechanical pilot valve, hydraulic turbine and open-belt drive. In I-only mode the turbine
drives the intake valve directly. In PI mode it turns the lead screw of the original rack-and-pinion carriage:
`h0 = reference + I/Kp`, so the required carriage gain is `Ki/Kp`. This preserves independently adjustable
Kp and Ki. The integrator respects the physical valve stops and carriage travel. Fixed hydraulic calibration
and screw pitch are in `labMechanics`; pulley ratios and rotations follow the corresponding transmission.
The earlier mechanical PI demonstration is retained on its original route and uses its original parametrization.

All five student modes draw the same single drain valve; the five consumers remain only in the original demos.
Grades 7–9 retain 12%, 24% and 36% constant openings. Grades 8–9 also offer a 12→36% step at 30 s
and the random scenario. Grades 6 and 10 use the random scenario automatically. It starts at 24% for 12 s,
then selects a different opening from 12/18/24/30/36% every 8–14 s. There are no changes in the final 30 s,
so the final-window error can be measured after a sustained load. `labDrain` configures this pattern;
`labSettings.seed` makes it repeatable. The drain handle, flow and plot follow the actual scheduled opening.
Grade 6's supply fraction now measures the single drain against its nominal flow at the desired level
and current opening, with the existing ±3% flow tolerance. It is a fraction of running time, not five consumers.

The steady-level estimate requires a level range ≤ 0.002 m over the last 10 seconds of the current drain segment.
The 63% response time is measured toward the observed settled level, from the latest disturbance step.
An unsettled response shows a dash; the final-window mean error and oscillation range remain available.
For random loads the measurement segment restarts at each valve change.

## Calibration for the exercise author

Run `npm run analyze:lab` to reproduce 137 complete runs of the application's actual reducer. The resulting
`analysis/lab-sweep.csv` contains P, I and PI sweeps and two manual-operation benchmarks. These are calibration
results for the exercise author, not student instructions or answers displayed in the app.

The verified classroom pattern uses seed 2024, dt = 0.1 s, tank area 0.025 m² and maximum intake 0.0025 m³/s.
For the 120 s modes the drain changes at 0/12/24.3/36.4/48.4/57.4/69.6/82.4 s to
24/36/24/30/18/24/30/18%. The last opening is held until the end.

Suggested exploration:

| Mode | Parameter choices | What the simulation supports |
| --- | --- | --- |
| P, grades 7–8 | Kp = 1, 2, 4, 8; h0 around 0.50–0.70 m; drain 12/24/36% | Compare response and load-dependent offset. At Kp = 4, h0 ≈ 0.585 m balances the 24% drain at h = 0.5 m; 12% and 36% require ≈ 0.542 and 0.627 m respectively. A fixed h0 cannot balance all three loads at the target. |
| I, grade 9 | Ki = 0.1, 0.5, 1; initially use the 24% drain | Starting at 0.35 m, peaks are 0.592/0.619/0.627 m and target crossings are 3/6/9 over 90 s. The last-10-s level ranges are 0.022/0.027/0.065 m: none is settled. Use this to compare oscillations; do not require a quiet response from I alone. |
| PI, grade 10 | Explore Kp = 4–8, Ki = 0.3–1; reference pair 6 and 0.5 | All sampled combinations Kp = 4/5/6/8 and Ki = 0.3/0.5/1 meet the existing numerical criteria on this pattern. This is a useful search region, not a unique optimum. |

For PI with Kp = 6, Ki = 0.5: IAE = 0.933 m·s, level = 0.4786–0.5196 m, final-10-s mean error
= −0.00156 m and no actuator saturation. Kp = 1, Ki = 0.05 gives IAE = 3.988 m·s and mean error
= −0.0429 m, failing both criteria (IAE ≤ 1.5 m·s, absolute final mean error ≤ 0.01 m).
The interface still reports measurements without assigning grades. These bounds apply to this idealized
plant and this disturbance; they are not universal tuning rules. High Ki can reach physical limits,
so peak size does not increase monotonically across the full slider range.

For manual control at 0.75 m, leaving the intake at 42% gives 23.2% adequate supply time. A simulated
operator who observes the drain with a 2 s delay and corrects the intake every 2 s achieves 94.8%.
This verifies that the 50% target is attainable with a simple feedback strategy; it is not a human usability test.
There is no automatic assistance in the manual UI.

## Original demonstrations

The original routes remain accessible directly (`#/manual`, `#/mechanical`, `#/operator`, `#/tank`,
`#/tuning`, `#/load`, `#/pi`).

- **Manual control**: set the intake valve by hand and keep the level at the reference (0.75 m, 120 s).
- **Mechanical control**: a pontoon rack drives a pinion and adjustable belt transmission. Tune Kp and closing level h0. A fixed 2:1 open-belt reduction connects the upper pulley to the valve; the Kp calculation includes this reduction.

On both pages the tank feeds a continuous drain valve and five industrial consumers (C1–C5) with different pipe diameters. The consumers switch on and off at random, so the controller has to compensate for changing demand.

Each consumer needs its nominal flow, the flow at the reference level. Its label turns green when the actual flow is within 1 % of nominal, yellow within 3 % and red otherwise (`consumers.tolerance`). Poor level tracking shows up directly as consumers not getting their flow.

Each run is scored by the integral of absolute error (IAE, m·s), shown in the chart.

## Model

Explicit Euler with step `dt` (`config.simulation.step`):

```
Q_in  = Q_max · u_in / 100
Q_out = √(2 g h) · u_out / 100 / k  +  Σ_on Cd · π d_i² / 4 · √(2 g h)
h    += (Q_in − Q_out) · dt / A        (clamped to 0 … tank height)
IAE  += |h_ref − h| · dt
```

All parameters (tank geometry, flows, durations, references, linkage geometry, consumers) are in [src/config.js](src/config.js).

The consumer on/off pattern comes from a seeded random generator (`consumers.seed`). With a fixed seed every student gets the same disturbance, so IAE results are comparable. Set it to `null` for a new pattern on every reset.

## Structure

- `src/simulation/` – pure model, P and independent I/PI controllers, measurements, consumer schedule, state reducer and tests
- `src/context/` – per-mode state (`SimulationProvider`), simulation loop (`useTankModel`)
- `src/pages/` – student lab (`LabPage`) and original demonstration pages
- `src/components/` – plant shared by both pages (`TankPlant`), outlet pipes and valves (`Outlets`), sliders, canvas linkage drawing, chart

## Scripts

```
npm install
npm run dev       # dev server on http://localhost:3000
npm test          # Vitest (watch mode; `npx vitest run` for a single run)
npm run lint      # ESLint
npm run analyze:lab # reproduce the calibration sweep in analysis/lab-sweep.csv
npm run build     # production build in build/
npm run build:single  # one self-contained HTML file in dist-single/index.html (opens from disk, no server)
npm run preview   # serve the production build
```
