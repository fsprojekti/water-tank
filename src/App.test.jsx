import {act, fireEvent, render, screen, within} from "@testing-library/react";
import App from "./App";
import SimulationProvider from "./context/SimulationProvider";

//jsdom has no canvas: stub echarts and the 2D context
vi.mock("echarts/core", () => ({
    use: vi.fn(),
    init: () => ({setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), getZr: () => ({on: vi.fn()})}),
}));

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {get: () => vi.fn()});
});

test("workbench tabs keep simulation settings and show independent I and PI controls", () => {
    window.location.hash = "/vaja/7";
    renderApp();
    const tabs = () => within(screen.getByRole("navigation", {name: "Načini regulacije"}));
    expect(tabs().getAllByRole("link")).toHaveLength(6);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Postopek poskusa")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /zapisnik|Shrani meritev/})).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", {name: "Kp"}), {target: {value: "4"}});
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    //The drain slider snaps to the openings the task allows (12 % and 36 %)
    fireEvent.change(screen.getByRole("slider", {name: "Odtok"}), {target: {value: "30"}});
    expect(screen.getByRole("slider", {name: "Odtok"})).toHaveValue("36");
    fireEvent.change(screen.getByRole("slider", {name: "Odtok"}), {target: {value: "20"}});
    expect(screen.getByRole("slider", {name: "Odtok"})).toHaveValue("12");
    fireEvent.click(screen.getByRole("button", {name: "Začni poskus"}));
    for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("slider", {name: "Kp"})).toBeDisabled();
    expect(screen.getByRole("slider", {name: "Odtok"})).toBeDisabled();
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByRole("status", {name: "Rezultat poskusa"})).toHaveTextContent("Poskus je končan");

    fireEvent.click(tabs().getByRole("link", {name: /Ocena 9/}));
    expect(screen.queryByRole("slider", {name: "Kp"})).not.toBeInTheDocument();
    expect(screen.getByRole("slider", {name: "Ki"})).toBeInTheDocument();
    expect(screen.getByRole("img", {name: /Mehanski I-regulator/})).toBeInTheDocument();
    expect(screen.queryByText("Pogon")).not.toBeInTheDocument();
    fireEvent.click(tabs().getByRole("link", {name: /Ocena 10/}));
    expect(screen.getByRole("slider", {name: "Kp"})).toBeInTheDocument();
    expect(screen.getByRole("slider", {name: "Ki"})).toBeInTheDocument();
    expect(screen.getByRole("img", {name: /Mehanski PI-regulator/})).toBeInTheDocument();
    expect(screen.getByRole("slider", {name: "Odtok"})).toBeDisabled();
    expect(screen.queryByText("C1")).not.toBeInTheDocument();
    expect(screen.getByText("Naključno · 12–36 %")).toBeInTheDocument();
    fireEvent.click(tabs().getByRole("link", {name: /Ocena 7/}));
    expect(screen.getByRole("slider", {name: "Kp"})).toHaveValue("4");
    expect(screen.getByRole("status", {name: "Rezultat poskusa"})).toHaveTextContent("Poskus je končan");
    fireEvent.click(screen.getByRole("button", {name: "Nov poskus"}));
    expect(screen.getByRole("slider", {name: "Kp"})).toBeEnabled();
    expect(screen.getByRole("slider", {name: "Kp"})).toHaveValue("4");
});

test("the home page opens the first student objective", () => {
    window.location.hash = "/";
    renderApp();
    expect(screen.getByRole("heading", {name: /Ročna regulacija/})).toBeInTheDocument();
    expect(screen.getByRole("slider", {name: "Dovod"})).toBeEnabled();
    expect(screen.getByRole("slider", {name: "Odtok"})).toBeDisabled();
    expect(screen.queryByText("C1")).not.toBeInTheDocument();
});

test("leaving a running student tab pauses it until explicitly resumed", () => {
    window.location.hash = "/vaja/8";
    renderApp();
    fireEvent.click(screen.getByRole("button", {name: "Začni poskus"}));
    for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("1.0 / 90 s")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", {name: /Ocena 9/}));
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("link", {name: /Ocena 8/}));
    expect(screen.getByText("1.0 / 90 s")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Nadaljuj"})).toBeEnabled();
    expect(screen.getByRole("button", {name: "Premor"})).toBeDisabled();
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const renderApp = () => render(<SimulationProvider><App/></SimulationProvider>);

test("runs the manual simulation and keeps state across pages", () => {
    window.location.hash = "/manual";
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
    expect(screen.getByText("Gain Kp:")).toBeInTheDocument();
    expect(screen.getByText(/^0\.0 \/ 60 s$/)).toBeInTheDocument();

    //Grade 10 draws the integral drive next to the tank
    fireEvent.click(screen.getByText("Grade 10"));
    expect(screen.getByText("supply")).toBeInTheDocument();
    expect(screen.getByText("Turbine Ki:")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Manual control"));
    expect(screen.getByText(/^1\.0 \/ 120 s$/)).toBeInTheDocument();
});

test("mechanism changes can be undone and redone", () => {
    window.location.hash = "/sestavi";
    renderApp();
    const check = () => screen.getByLabelText("Delovanje mehanizma");
    expect(screen.getByRole("button", {name: "Razveljavi"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {name: "Primer"}));
    expect(check()).toHaveTextContent("Kp 3.98");
    fireEvent.click(screen.getByRole("button", {name: "Razveljavi"}));
    expect(check()).toHaveTextContent("Kp —");
    expect(screen.getByRole("button", {name: "Razveljavi"})).toBeDisabled();
    fireEvent.keyDown(window, {key: "y", ctrlKey: true});
    expect(check()).toHaveTextContent("Kp 3.98");
    fireEvent.keyDown(window, {key: "z", ctrlKey: true});
    expect(check()).toHaveTextContent("Kp —");
    fireEvent.click(screen.getByRole("button", {name: "Ponovi"}));
    expect(check()).toHaveTextContent("Kp 3.98");
});
