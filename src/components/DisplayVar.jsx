const variants = {
    default: {backgroundColor: "#D7DBDD", borderColor: "#AEB6BF"},
    reference: {backgroundColor: "#fd8000", borderColor: "#ce700f"},
};

const DisplayVar = ({top, left, name, value, unit, decimal, variant = "default"}) => (
    <div className={"d-flex flex-column"} style={{
        position: "absolute",
        top,
        left,
        ...variants[variant],
        borderStyle: "solid",
        borderWidth: "2px",
        borderRadius: "5px",
    }}>
        <div className={"d-flex align-items-end"} style={{paddingLeft: "20px", paddingRight: "20px"}}>
            <div className={"p-1"}><b>{name}: </b></div>
            <div className={"p-1"}><b>{value.toFixed(decimal)}</b></div>
            <div className={"p-1"}><b><i>{unit}</i></b></div>
        </div>
    </div>
);

export default DisplayVar;
