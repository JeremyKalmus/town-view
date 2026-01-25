import '@testing-library/jest-dom'

// Mock ResizeObserver for VirtualList tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
