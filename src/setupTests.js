import "@testing-library/jest-dom/vitest";

//jsdom has no layout, so element sizes never change
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
