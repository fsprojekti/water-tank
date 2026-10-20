# Water tank

Interactive water tank level control simulation for the MKTP laboratory. Built with React and Vite.

- **Manual control**: set the intake valve by hand and keep the level at the reference (0.75 m, 120 s).
- **Mechanical control**: a pontoon drives the intake valve through a rod linkage. Tune the horizontal and vertical rods (l3, l4) so the level settles at the reference (0.5 m, 60 s).

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

- `src/simulation/` – pure model (`model.js`), linkage geometry (`linkage.js`), consumer schedule (`schedule.js`), state reducer (`reducer.js`) and tests
- `src/context/` – shared state for both pages (`SimulationProvider`) and the per-page hook with the simulation loop (`useTankModel`)
- `src/pages/` – manual and mechanical control pages
- `src/components/` – plant shared by both pages (`TankPlant`), outlet pipes and valves (`Outlets`), sliders, canvas linkage drawing, chart

## Scripts

```
npm install
npm run dev       # dev server on http://localhost:3000
npm test          # Vitest (watch mode; `npx vitest run` for a single run)
npm run lint      # ESLint
npm run build     # production build in build/
npm run build:single  # one self-contained HTML file in dist-single/index.html (opens from disk, no server)
npm run preview   # serve the production build
```
