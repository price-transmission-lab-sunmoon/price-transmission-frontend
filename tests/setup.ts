import '@testing-library/jest-dom';

// jsdom polyfills for browser-only APIs used by D3 components
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

