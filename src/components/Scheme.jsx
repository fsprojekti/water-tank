import {useRef} from "react";
import config from "../config";
import modelImage from "../img/model.png";
import useAvailableSize from "./useAvailableSize";

//Scheme size in scheme coordinates [Px] and the part of it that is shown
const imageWidthPx = 1500;
const heightPx = 860;
const {left: viewLeftPx, right: viewRightPx} = config.render.viewPx;
const viewWidthPx = viewRightPx - viewLeftPx;
//Largest enlargement on big screens
const maxScale = 1.3;

/**
 * Process scheme background; children are positioned absolutely in scheme coordinates.
 * The shown part of the scheme is scaled to fit its column and the window height.
 * Water animations are frozen while not running.
 */
const Scheme = ({children, running}) => {
    const ref = useRef(null);
    const {width, height} = useAvailableSize(ref);
    const scale = width > 0 ? Math.max(0.3, Math.min(maxScale, width / viewWidthPx, height / heightPx)) : 1;

    return (
        <div ref={ref} style={{height: heightPx * scale}}>
            <div style={{
                position: "relative",
                margin: "0 auto",
                width: viewWidthPx * scale,
                height: heightPx * scale,
                overflow: "hidden",
            }}>
                <div className={running ? undefined : "scheme-paused"} style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: imageWidthPx,
                    height: heightPx,
                    transform: `scale(${scale}) translateX(${-viewLeftPx}px)`,
                    transformOrigin: "0 0",
                    //Image background is transparent, the page colour shows through
                    backgroundImage: `url(${modelImage})`,
                    backgroundSize: `${imageWidthPx}px`,
                    backgroundRepeat: "no-repeat",
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Scheme;
