import {act, fireEvent, render, screen} from "@testing-library/react";
import App from "./App";
import SimulationProvider from "./context/SimulationProvider";

//jsdom has no canvas: stub echarts and the 2D context
vi.mock("echarts/core", () => ({
    use: vi.fn(),
    init: () => ({setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn()}),
}));

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {get: () => vi.fn()});
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const renderApp = () => render(<SimulationProvider><App/></SimulationProvider>);

test("runs the manual simulation and keeps state across pages", () => {
    renderApp();
    expect(screen.getByText(/^0\.0 \/ 120 s$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Run"}));
    //Countdown before the run starts
    for (const count of ["3", "2", "1"]) {
        expect(screen.getByText(count)).toBeInTheDocument();
        act(() => vi.advanceTimersByTime(1000));
    }
    expect(screen.getByText(/^0\.0 \/ 120 s$/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/^1\.0 \/ 120 s$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Stop"}));
    fireEvent.click(screen.getByText("Mechanical control"));
    expect(screen.getByText("Rod l3:")).toBeInTheDocument();
    expect(screen.getByText(/^0\.0 \/ 60 s$/)).toBeInTheDocument();

    //Grade 10 draws the integral drive next to the tank
    fireEvent.click(screen.getByText("Grade 10"));
    expect(screen.getByText("supply")).toBeInTheDocument();
    expect(screen.getByText("Turbine Ki:")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Manual control"));
    expect(screen.getByText(/^1\.0 \/ 120 s$/)).toBeInTheDocument();
});
