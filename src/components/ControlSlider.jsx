import RangeSlider from "react-bootstrap-range-slider";

//Controlled slider panel used for valves and rod lengths; info is an optional second line (e.g. the flow).
//Without top the panel stays in normal flow, so a parent can stack several panels.
const ControlSlider = ({
                           top, left, width = 180, value, onChange, info,
                           label = "Position", unit = "%",
                           min = 0, max = 100, step = 1, decimals = 0,
                           disabled = false,
                       }) => (
    <div className={"d-flex flex-column"} style={{
        position: top === undefined ? "relative" : "absolute",
        top,
        left,
        width,
        padding: "4px 12px 2px",
        backgroundColor: "#D7DBDD",
        borderStyle: "solid",
        borderColor: "#AEB6BF",
        borderWidth: "2px",
        borderRadius: "5px",
    }}>
        <div className={"d-flex justify-content-between"}>
            <b>{label}:</b>
            <span><b>{value.toFixed(decimals)}</b> {unit}</span>
        </div>
        {info && <div className={"d-flex justify-content-between"} style={{fontSize: "14px"}}>{info}</div>}
        <RangeSlider
            aria-label={label}
            value={value}
            tooltip={"off"}
            disabled={disabled}
            onChange={(event) => onChange && onChange(parseFloat(event.target.value))}
            min={min}
            max={max}
            step={step}
        />
    </div>
);

export default ControlSlider;
