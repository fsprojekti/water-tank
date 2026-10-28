# Water tank

Interactive water tank level control simulation for the MKTP laboratory. Built with React and Vite.

## Student workbench

The home page opens `#/vaja/6`: one Slovenian interface with five graded tabs, a mechanism builder and a shared tank model.

| Tab | Mode |
| --- | --- |
| 6 | Manual regulation with one randomly opening drain, 120 seconds |
| 7 | P time constant and steady-state error: adjustable Kp, drain 12% or 36%, reference 0.75 m, 60 seconds |
| 8 | P under load: three drains and a drain step at 30 seconds, 90 seconds |
| 9 | Independent I-only controller with adjustable Ki, 90 seconds |
| 10 | Parallel PI with the same randomly opening drain, 120 seconds |

The page contains the plant diagram, controls, plots and live measurements. Assignments, explanations,
assessment instructions and student reporting are separate Moodle material; they are not part of this app.

Runs are in real time (1×). Controller settings and the drain are locked until **Nov poskus**. Where a task allows
only fixed drain openings (grade 7: 12% and 36%), the drain valve slider snaps to them; grades 8–9 choose the
drain scenario in the toolbar.

The chart follows the pointer with dashed vertical and horizontal lines and time and value read-outs on the axes. The mouse wheel zooms time, Shift+wheel zooms
the value axis under the pointer, dragging pans, and the slider below selects a time window. The toolbar zooms to a
drawn rectangle, steps back, fits everything (also on double-click) and saves the chart as an image.
The line tool draws straight lines on the level chart, e.g. tangents for the time constant: the first click sets the
point (snapped to the level curve when close to it), the line then rotates with the pointer, and a second click fixes
it. Escape cancels; the clear button removes all lines. Lines stay through a new run, so runs can be compared.

Leaving a tab pauses its simulation; the model remains in memory. Live runs reset on a page reload. There is no notebook, submission flow or automatic grade in the interface.

Runtime modes and drain scenarios are in `src/labConfig.js`. Grades 7–8 use the mechanical P controller `u = clamp(Kp*(reference - h), 0, 1)`:
the carriage is fixed with the closing level at the reference, so only Kp is adjustable. I and PI use normalized valve opening:
`u = clamp(Kp*e + I, 0, 1)`, `dI/dt = Ki*e`, with conditional integration at actuator limits.
I-only omits P entirely. Kp is in 1/m and Ki in 1/(m·s), independently adjustable; initial I is 0.34.
Both use the mechanical pilot valve, hydraulic turbine and open-belt drive. In I-only mode the turbine
drives the intake valve directly. In PI mode it turns the lead screw of the original rack-and-pinion carriage:
`h0 = reference + I/Kp`, so the required carriage gain is `Ki/Kp`. This preserves independently adjustable
Kp and Ki. The integrator respects the physical valve stops and carriage travel. Fixed hydraulic calibration
and screw pitch are in `labMechanics`; pulley ratios and rotations follow the corresponding transmission.
The earlier mechanical PI demonstration is retained on its original route and uses its original parametrization.

All five student modes draw the same single drain valve; the five consumers remain only in the original demos.
Grade 7 offers the 12% and 36% openings; grades 8–9 retain 12%, 24% and 36% constant openings. Grades 8–9 also offer a 12→36% step at 30 s
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

### Mechanism builder

The **Sestavi regulator** tab (`#/sestavi`) is a workshop, not a graded task yet: the student builds the level
controller over the tank from parts and runs it like the measuring pages (60 s, reference 0.75 m, drain 12/24/36%).

- Parts are dragged from the palette onto the scheme (a click drops one above the tank): float (width), smooth bar
  (length, angle), wheel (radius; a friction wheel or a pulley). The intake valve is always there with its own pulley
  (radius) and opens a quarter turn counterclockwise. There is no separate guide part.
- A bar has a motion axis (on by default): its own line, fixed to the frame and drawn as a thin dashed line, so the
  bar only slides along itself, without turning. Selecting the bar
  highlights the line; dragging it moves the bar across, the round handle past the bar's end turns the bar with its
  axis in 5° steps. The axis can be
  switched off in the panel (e.g. for a lever on a pivot).
- Joints are made by dragging a point (○) onto another point for a pin (toggle to a rigid joint in the panel; two
  axles share a shaft). A **Ležaj** (bearing, drawn as a triangle on a hatched base) dropped on a wheel axle or a point
  fixes it where it is; a wheel's panel also has **Os v ležaju**. The **Stik** tool defines the surfaces that roll on
  each other: click a wheel, then a bar (its faces are highlighted) or another wheel's rim; the wheel's shaft moves
  across until they touch, with its frame mounts, so a wheel already fixed on the frame still rolls on the bar.
  A wheel dropped against a bar or wheel is also mounted on touch. The **Jermen** tool joins two wheels, open or
  crossed. Changes that can't be assembled (the parts would jam) are refused with a message.
- Everything works by friction without slipping, except the valve pulley, which slips at the valve stops: after the
  valve saturates, its closing level moves. **Zapri ventil pri tem nivoju** sets the closing level h0 to the current
  water level; the **Nivo vode** slider moves the water by hand to try the mechanism, and the run starts from there.
- The panel shows the valve opening, Kp (the closing slope of the opening against level at h0) and h0, measured by
  moving the water through the whole tank, and lists what keeps the mechanism from working: missing float or joints,
  parts free to move, positive feedback, a wheel running off its bar, a jam or a float
  hanging on the mechanism.
- `src/simulation/mechanism.js` solves the poses every step from the water level (Levenberg-Marquardt on the joint
  equations, rolling without slip `Δu = r·Δφ`, belts `r₁φ₁ = ±r₂φ₂`, axes keep the bar's angle and an anchor on the line); `src/simulation/assembly.js` holds the editing
  operations and **Primer**, a ready mechanism equal to the measuring pages: Kp = 2·r_pulley / (π·r_wheel·r_valve).
  The mechanism is kept in the browser's local storage; guides saved by the first version are dropped on loading.

## Calibration for the exercise author

Run `npm run analyze:lab` to reproduce 121 complete runs of the application's actual reducer. The resulting
`analysis/lab-sweep.csv` contains P, I and PI sweeps and two manual-operation benchmarks. These are calibration
results for the exercise author, not student instructions or answers displayed in the app.

The verified classroom pattern uses seed 2024, dt = 0.1 s, tank area 0.025 m² and maximum intake 0.0025 m³/s.
For the 120 s modes the drain changes at 0/12/24.3/36.4/48.4/57.4/69.6/82.4 s to
24/36/24/30/18/24/30/18%. The last opening is held until the end.

Suggested exploration:

| Mode | Parameter choices | What the simulation supports |
| --- | --- | --- |
| P, grade 7 | Kp = 1…10; drain 12% and 36% | The tank starts settled at the 0.75 m reference with the valve closed; the drain opens at the start. The valve never exceeds 60%, so the 63% time follows the linearised τ = A/(Qmax·Kp + dQdrain/dh) within 0.3 s. 12%: t63 = 8.7/4.7/3.2/2.4/1.9/1.6/1.4/1.2/1.1/1.0 s, error = 0.181/0.097/0.066/0.050/0.040/0.034/0.029/0.026/0.023/0.020 m. 36%: t63 = 6.5/4.0/2.9/2.2/1.8/1.6/1.3/1.2/1.1/1.0 s, error = 0.416/0.254/0.181/0.141/0.115/0.097/0.084/0.074/0.066/0.060 m. At high Kp both rows approach A/(Qmax·Kp) = 10/Kp s. |
| P, grade 8 | Kp = 2, 4, 8; drain 12/24/36% and the step | Reference 0.5 m. At Kp = 4 the 12/24/36% drains leave 0.041/0.078/0.112 m; the offset roughly halves when Kp doubles. |
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
