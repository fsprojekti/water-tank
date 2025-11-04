import React, { useContext, useEffect, useRef } from 'react';
import { MechanicalContext } from '../contexts/MechanicalContext.jsx';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** circle–circle intersection. Returns both solutions (i1, i2) or null if none */
function circleCircle(P, r, Q, s) {
    const [x0, y0] = P, [x1, y1] = Q;
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d < 1e-9) return null;
    if (d > r + s || d < Math.abs(r - s)) return null;

    const a = (r*r - s*s + d*d) / (2*d);
    const h = Math.sqrt(Math.max(0, r*r - a*a));

    const xm = x0 + (a * dx) / d;
    const ym = y0 + (a * dy) / d;

    const rx = -(dy * h) / d;
    const ry =  (dx * h) / d;

    return [[xm + rx, ym + ry], [xm - rx, ym - ry]];
}

export default function Mechanism({ width = 1400, height = 630, onValveChange, style }) {
    const {
        config,
        mechanical_tankLevel, l3, l4,
        set_governorPositionPx,
    } = useContext(MechanicalContext);

    const canvasRef = useRef(null);
    const lastAyRef = useRef(200);  // keep previous A.y to stabilize branch choice

    const rr = (ctx, x, y, w, h, r=6) => {
        if (ctx.roundRect) { ctx.roundRect(x,y,w,h,r); return; }
        const R = Math.min(r, w/2, h/2);
        ctx.beginPath();
        ctx.moveTo(x+R, y);
        ctx.lineTo(x+w-R, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+R);
        ctx.lineTo(x+w, y+h-R);
        ctx.quadraticCurveTo(x+w, y+h, x+w-R, y+h);
        ctx.lineTo(x+R, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-R);
        ctx.lineTo(x, y+R);
        ctx.quadraticCurveTo(x, y, x+R, y);
    };

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        const { render, tank, controller, pontoon } = config;
        const m2Px = render.m2Px;

        // Water level (your system uses tank.offsetPx as baseline)
        const levelY = tank.offsetPx - mechanical_tankLevel * m2Px;

        // Pontoon rectangle and point E (top center of pontoon)
        ctx.beginPath();
        rr(ctx, pontoon.axisXPx - 125, levelY - pontoon.heightPx, 250, pontoon.heightPx, 6);
        ctx.fillStyle = '#d54436';
        ctx.fill();

        const A = [controller.axisYGovernorPositionPx, lastAyRef.current]; // A.x fixed, A.y solved below
        const C = controller.swingPointPx;                                  // fixed pivot
        const E = [pontoon.axisXPx, levelY - pontoon.heightPx];

        const l1Px = controller.l1 * m2Px;  // A–B
        const l2Px = controller.l2 * m2Px;  // B–C
        const l3Px = l3 * m2Px;             // C–D
        const l4Px = l4 * m2Px;             // D–E

        // Solve D from C & E
        let D;
        {
            const sol = circleCircle(C, l3Px, E, l4Px);
            // prefer the solution that visually slopes toward E
            if (sol) {
                D = sol[0][0] > sol[1][0] ? sol[0] : sol[1];
            } else {
                D = [...E];
            }
        }

        // Solve B as intersection of circles centered at A (r=l1) and C (r=l2)
        // We don't know A.y yet perfectly, so start with lastAyRef (previous A.y),
        // get B candidates, choose the one whose direction (C->B) roughly points toward D,
        // then recompute exact A.y from chosen B.
        let B;
        {
            const sol = circleCircle(A, l1Px, C, l2Px);
            if (sol) {
                // Choose the one that aligns with the direction to D
                const score = (p) => {
                    const v = [p[0]-C[0], p[1]-C[1]];
                    const w = [D[0]-C[0], D[1]-C[1]];
                    const dot = v[0]*w[0] + v[1]*w[1];
                    return dot; // larger is "more toward D"
                };
                B = score(sol[0]) > score(sol[1]) ? sol[0] : sol[1];
            } else {
                // fallback: place B along C->D with length l2
                const angCD = Math.atan2(D[1]-C[1], D[0]-C[0]);
                B = [C[0] - l2Px * Math.cos(angCD), C[1] - l2Px * Math.sin(angCD)];
            }
        }

        // Recompute exact A.y so that |A-B| == l1 and A.x is fixed
        {
            const dx = Math.abs(A[0] - B[0]);
            const v = Math.sqrt(Math.max(0, l1Px*l1Px - dx*dx));
            // two vertical solutions: above or below B; pick closer to previous A.y
            const cand1 = B[1] - v;
            const cand2 = B[1] + v;
            const prev  = lastAyRef.current;
            A[1] = Math.abs(cand1 - prev) <= Math.abs(cand2 - prev) ? cand1 : cand2;
            lastAyRef.current = A[1];
        }

        // Draw fixed triangle under C
        const tri = 16;
        ctx.beginPath();
        ctx.moveTo(C[0] - tri, C[1] + tri + 4);
        ctx.lineTo(C[0] + tri, C[1] + tri + 4);
        ctx.lineTo(C[0],       C[1] - 2);
        ctx.closePath();
        ctx.fillStyle = '#666';
        ctx.fill();

        // Draw joints
        const dot = ([x,y]) => { ctx.beginPath(); ctx.arc(x,y,12,0,Math.PI*2); ctx.fillStyle = '#33393e'; ctx.fill(); };
        dot(A); dot(B); dot(C); dot(D); dot(E);

        // Links
        ctx.beginPath();
        ctx.moveTo(A[0], A[1]);
        ctx.lineTo(B[0], B[1]);
        ctx.lineTo(C[0], C[1]);
        ctx.lineTo(D[0], D[1]);
        ctx.lineTo(E[0], E[1]);
        ctx.strokeStyle = '#33393e';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Update governor pos and valve mapping
        set_governorPositionPx?.(A[1]);
        const yOpen = controller.governorYMinPx;
        const yClosed = controller.governorYMaxPx;
        const raw = 100 * (yClosed - A[1]) / Math.max(1, (yClosed - yOpen)); // higher A => more open (tweak if opposite)
        const pct = clamp(raw, controller.valveMinPct ?? 0, controller.valveMaxPct ?? 100);
        onValveChange?.(pct);
    }, [config, mechanical_tankLevel, l3, l4, width, height, onValveChange, set_governorPositionPx]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ pointerEvents: 'none', ...style }}  // so it doesn't block sliders/inputs
        />
    );
}
