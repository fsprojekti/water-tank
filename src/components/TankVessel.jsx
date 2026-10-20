import tank from "./tankGeometry";

const wallColor = "#595959";

//Tank walls
const TankVessel = () => {
    const {innerLeftPx, innerRightPx, wallPx, bottomPx, leftWallTopPx, rightWallTopPx, pipeGapPx} = tank;
    return (
        <svg width={1500} height={bottomPx + wallPx}
             style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
            {/*Left wall is interrupted where the intake pipe crosses it*/}
            <rect x={innerLeftPx - wallPx} y={leftWallTopPx} width={wallPx} height={pipeGapPx[0] - leftWallTopPx}
                  fill={wallColor}/>
            <rect x={innerLeftPx - wallPx} y={pipeGapPx[1]} width={wallPx} height={bottomPx + wallPx - pipeGapPx[1]}
                  fill={wallColor}/>
            <rect x={innerLeftPx - wallPx} y={bottomPx} width={innerRightPx - innerLeftPx + 2 * wallPx}
                  height={wallPx} fill={wallColor}/>
            <rect x={innerRightPx} y={rightWallTopPx} width={wallPx} height={bottomPx + wallPx - rightWallTopPx}
                  fill={wallColor}/>
        </svg>
    );
};

export default TankVessel;
