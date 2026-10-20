import colors from "./pipeColors";

/**
 * Ball valve seen from the front, centred at (x, y) on a pipe of given width [Px].
 * The handle lies along the pipe when open and across it when closed; open is 0…1.
 */
const BallValve = ({x, y, width, open, horizontal = false}) => {
    const radius = width * 0.65 + 4;
    const length = width * 1.6 + 14;
    //Handle is drawn vertical, then turned: along a vertical pipe at 0°, along a horizontal one at 90°
    const angle = horizontal ? 90 * open : 90 * (1 - open);
    return (
        <g>
            {[-radius - 6, radius].map((offset) => (horizontal
                ? <rect key={offset} x={x + offset} y={y - width / 2 - 5} width={6} height={width + 10} rx={2}
                        fill={colors.pipeDark}/>
                : <rect key={offset} x={x - width / 2 - 5} y={y + offset} width={width + 10} height={6} rx={2}
                        fill={colors.pipeDark}/>
            ))}
            <circle cx={x} cy={y} r={radius} fill={colors.pipe} stroke={colors.pipeDark} strokeWidth={2}/>
            <rect x={x - 3.5} y={y - length / 2} width={7} height={length} rx={3.5} fill={colors.handle}
                  style={{
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: `${x}px ${y}px`,
                      transition: "transform 0.3s",
                  }}/>
            <circle cx={x} cy={y} r={5} fill={colors.hub}/>
        </g>
    );
};

export default BallValve;
