import colors from "./pipeColors";

const unit = ([x, y]) => {
    const length = Math.hypot(x, y);
    return [x / length, y / length];
};

//Elastic belt between two pulleys: the straight spans on both sides
export const BeltSpans = ({a, b}) => {
    const [nx, ny] = unit([b.y - a.y, a.x - b.x]);
    return [1, -1].map((side) => (
        <line key={side} x1={a.x + side * nx * a.r} y1={a.y + side * ny * a.r}
              x2={b.x + side * nx * b.r} y2={b.y + side * ny * b.r} stroke={colors.belt} strokeWidth={4}/>
    ));
};

//Pulley with spokes turned by angle [rad]
export const Pulley = ({x, y, r, angle}) => (
    <g transform={`rotate(${angle * 180 / Math.PI} ${x} ${y})`}>
        <circle cx={x} cy={y} r={r} fill={colors.steel} stroke={colors.belt} strokeWidth={3}/>
        {[0, 1, 2].map((i) => {
            const a = i * 2 * Math.PI / 3;
            return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * r} y2={y + Math.sin(a) * r}
                         stroke={colors.metal} strokeWidth={2}/>;
        })}
        <circle cx={x} cy={y} r={3} fill={colors.metal}/>
    </g>
);

//Spur gear: teeth around a disc, turned by angle [rad]
export const Gear = ({x, y, r, angle, teeth}) => {
    const outline = [];
    for (let i = 0; i < teeth; i++) {
        const a = i * 2 * Math.PI / teeth;
        const w = Math.PI / teeth * 0.5;
        outline.push([a - w * 1.4, r - 4], [a - w, r + 4], [a + w, r + 4], [a + w * 1.4, r - 4]);
    }
    const points = outline.map(([a, rr]) => `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`).join(" ");
    return (
        <g transform={`rotate(${angle * 180 / Math.PI} ${x} ${y})`}>
            <polygon points={points} fill={colors.steel} stroke={colors.metal} strokeWidth={1.5}/>
            <circle cx={x} cy={y} r={r * 0.55} fill={"#ced4da"} stroke={colors.metal} strokeWidth={1}/>
            {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={x + Math.cos(i * Math.PI / 2) * r * 0.32} cy={y + Math.sin(i * Math.PI / 2) * r * 0.32}
                        r={3} fill={"#868e96"}/>
            ))}
        </g>
    );
};

//Fixed mount symbol: a beam with hatching above
export const FixedMount = ({x, y, width}) => (
    <g>
        <line x1={x - width / 2} y1={y} x2={x + width / 2} y2={y} stroke={colors.metal} strokeWidth={4}/>
        {Array.from({length: Math.floor(width / 8)}, (_, i) => {
            const hx = x - width / 2 + 4 + i * 8;
            return <line key={i} x1={hx} y1={y} x2={hx + 6} y2={y - 7} stroke={colors.metal} strokeWidth={1.5}/>;
        })}
    </g>
);
