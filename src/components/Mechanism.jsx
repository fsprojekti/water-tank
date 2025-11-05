import React, { useEffect, useRef } from 'react';

export default function Mechanism({
                                      width = 1400,
                                      height = 630,
                                      // required props
                                      config,
                                      tankLevel,         // numeric level in meters
                                      l3,                // rod length in meters
                                      l4,                // rod length in meters
                                      // optional callbacks
                                      onValveChange,     // (pct:number)=>void

                                  }) {
    const canvasRef = useRef(null);

    // rounded-rect helper
    const rr = (ctx, x, y, w, h, r = 6) => {
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
        const R = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + R, y);
        ctx.lineTo(x + w - R, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + R);
        ctx.lineTo(x + w, y + h - R);
        ctx.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
        ctx.lineTo(x + R, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - R);
        ctx.lineTo(x, y + R);
        ctx.quadraticCurveTo(x, y, x + R, y);
    };

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        const { render, tank, controller, pontoon } = config;
        const m2Px = render.m2Px;

        // water level Y (px)
        const levelY = tank.offsetPx - tankLevel * m2Px;

        // draw pontoon
        ctx.beginPath();
        rr(ctx, pontoon.axisXPx - 125, levelY - pontoon.heightPx, 250, pontoon.heightPx, 6);
        ctx.fillStyle = '#d54436';
        ctx.fill();

        // Points
        let A = [controller.axisYGovernorPositionPx, 0]; // A.x fixed; A.y solved
        let B = [0, 0];
        const C = controller.swingPointPx;               // fixed
        const E = [pontoon.axisXPx, levelY - pontoon.heightPx];

        // lengths (px)
        const l1Px = controller.l1 * m2Px; // A–B
        const l2Px = controller.l2 * m2Px; // B–C
        const l3Px = l3 * m2Px;            // C–D
        const l4Px = l4 * m2Px;            // D–E

        // 1) D from your helper
        const D = clcSwingPlatoonJointPoint(C, E, l3Px, l4Px);

        // 2) B from C toward D using your alpha approach
        const alpha = Math.atan((C[1] - D[1]) / (C[0] - D[0]));
        B = [C[0] - l2Px * Math.cos(alpha), C[1] - l2Px * Math.sin(alpha)];

        // 3) Solve A.y (|A−B| = l1), choose lower branch (A below B)
        const l6 = Math.abs(A[0] - B[0]);
        const under = l1Px * l1Px - l6 * l6;
        const l5 = under > 0 ? Math.sqrt(under) : 0;
        A[1] = B[1] + l5;

        // cosmetics: small support triangle at C
        const tri = 16;
        ctx.beginPath();
        ctx.moveTo(C[0] - tri, C[1] + tri + 4);
        ctx.lineTo(C[0] + tri, C[1] + tri + 4);
        ctx.lineTo(C[0], C[1] - 2);
        ctx.closePath();
        ctx.fillStyle = '#666';
        ctx.fill();

        // draw points
        const dot = ([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fillStyle = '#33393e'; ctx.fill(); };
        dot(A); dot(B); dot(C); dot(D); dot(E);

        // polyline ABCDE
        ctx.beginPath();
        ctx.moveTo(A[0], A[1]);
        ctx.lineTo(B[0], B[1]);
        ctx.lineTo(C[0], C[1]);
        ctx.lineTo(D[0], D[1]);
        ctx.lineTo(E[0], E[1]);
        ctx.strokeStyle = '#33393e';
        ctx.lineWidth = 5;
        ctx.stroke();

        // labels
        labelPoint(ctx, A, 'A');
        labelPoint(ctx, B, 'B');
        labelPoint(ctx, C, 'C');
        labelPoint(ctx, D, 'D');
        labelPoint(ctx, E, 'E');
        // labelRod(ctx, A, B, 'l₁');
        // labelRod(ctx, B, C, 'l₂');
        // labelRod(ctx, C, D, 'l₃');
        // labelRod(ctx, D, E, 'l₄');

        // --- governor → % open (no clamp helper)
        if (typeof setGovernorPositionPx === 'function') {
            setGovernorPositionPx(A[1]);
        }
        if (typeof onValveChange === 'function') {
            const yOpen   = controller.governorYMinPx;   // A.y at 100% open
            const yClosed = controller.governorYMaxPx;   // A.y at 0% open
            const span    = Math.max(1, yClosed - yOpen);
            let norm = (yClosed - A[1]) / span;          // normalize [0..1]
            if (norm < 0) norm = 0;
            else if (norm > 1) norm = 1;

            const vMin = (controller.valveMinPct ?? 0);
            const vMax = (controller.valveMaxPct ?? 100);
            const pct  = vMin + norm * (vMax - vMin);

            onValveChange(pct);
        }
    }, [config, tankLevel, l3, l4, width, height, onValveChange, setGovernorPositionPx]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={style}
        />
    );
}

/* ---------- label helpers ---------- */
function drawTag(ctx, text, x, y) {
    ctx.save();
    ctx.font = '14px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const padX = 6, h = 18;
    const w = ctx.measureText(text).width + padX * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.roundRect?.(x, y - h / 2, w, h, 6);
    if (!ctx.roundRect) ctx.rect(x, y - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = '#212529';
    ctx.fillText(text, x + padX, y);
    ctx.restore();
}

function labelPoint(ctx, P, name, offset = [14, -16]) {
    drawTag(ctx, name, P[0] + offset[0], P[1] + offset[1]);
}

function labelRod(ctx, P, Q, text, offsetPx = 18) {
    const mx = (P[0] + Q[0]) / 2;
    const my = (P[1] + Q[1]) / 2;
    const dx = Q[0] - P[0];
    const dy = Q[1] - P[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny =  dx / len;
    drawTag(ctx, text, mx + nx * offsetPx, my + ny * offsetPx);
}

/* ---------- your original D helper ---------- */
function clcSwingPlatoonJointPoint(swingPoint, platoonPoint, lengthSwingRod, lengthPlatoonRod) {
    let a = Math.abs(platoonPoint[1] - swingPoint[1]);
    let b = Math.abs(platoonPoint[0] - swingPoint[0]);
    let c = Math.sqrt(a * a + b * b);
    let beta = Math.asin(a / c);
    let beta_2 = Math.acos((lengthPlatoonRod * lengthPlatoonRod + c * c - lengthSwingRod * lengthSwingRod) / (2 * lengthPlatoonRod * c));
    let beta_3 = beta + beta_2;
    let e = lengthPlatoonRod * Math.sin(beta_3);
    let f = Math.sqrt(lengthPlatoonRod * lengthPlatoonRod - e * e);
    if (beta_3 > Math.PI / 2) {
        return [platoonPoint[0] + f, platoonPoint[1] - e];
    }
    return [platoonPoint[0] - f, platoonPoint[1] - e];
}
