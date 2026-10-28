//Scheme coordinates [Px] of a pointer position, through the scheme's scaling
const schemePoint = (svg, clientX, clientY) => {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const {x, y} = point.matrixTransform(svg.getScreenCTM().inverse());
    return [x, y];
};

export default schemePoint;
