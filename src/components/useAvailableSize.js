import {useLayoutEffect, useState} from "react";

//Space kept under the element [Px]
const marginPx = 16;

//Height [Px] from the element's top edge to the bottom of the window, and the element's width [Px]
const useAvailableSize = (ref) => {
    const [size, setSize] = useState({width: 0, height: 0});
    useLayoutEffect(() => {
        const element = ref.current;
        const measure = () => {
            const top = element.getBoundingClientRect().top + window.scrollY;
            setSize({width: element.clientWidth, height: window.innerHeight - top - marginPx});
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [ref]);
    return size;
};

export default useAvailableSize;
