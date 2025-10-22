import { vi, beforeEach, afterEach } from "vitest";
import * as React from "react";

// Ensure React is available globally
if (typeof global !== "undefined") {
  (global as any).React = React;
}

// Ensure window.React is available for jsdom
if (typeof window !== "undefined") {
  (window as any).React = React;
}

// Enhanced Mastra core mocks
vi.mock("@mastra/core", () => ({
  Agent: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      text: "Mock agent response",
      usage: { totalTokens: 10 },
    }),
    stream: vi.fn().mockImplementation(async function* (_messages) {
      yield { type: "text", text: "Mock streaming response" };
    }),
  })),
  Mastra: vi.fn().mockImplementation(() => ({
    getAgent: vi.fn().mockReturnValue({
      generate: vi.fn().mockResolvedValue({
        text: "Mock agent response",
        usage: { totalTokens: 10 },
      }),
      stream: vi.fn().mockImplementation(async function* (_messages) {
        yield { type: "text", text: "Mock streaming response" };
      }),
    }),
  })),
  Workflow: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "running",
      current: "gathering",
      context: {},
      history: [],
      timestamp: new Date().toISOString(),
    }),
    suspend: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "suspended",
      timestamp: new Date().toISOString(),
    }),
    resume: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "running",
      timestamp: new Date().toISOString(),
    }),
    sendCommand: vi.fn().mockResolvedValue({
      id: "mock-workflow-id",
      status: "running",
      timestamp: new Date().toISOString(),
    }),
  })),
}));

// Mock @mastra/tools if it exists (optional dependency)
vi.mock("@mastra/tools", () => ({
  createTool: vi.fn(),
  ToolRegistry: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    execute: vi.fn(),
    unregister: vi.fn(),
  })),
}));

// Mock @mastra/memory if it exists (optional dependency)
vi.mock("@mastra/memory", () => ({
  Memory: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
  })),
  createMemory: vi.fn(),
}));

// Mock @mastra/rag if it exists (optional dependency)
vi.mock("@mastra/rag", () => ({
  RAG: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({
      results: [],
      query: "",
      context: [],
    }),
    ingestDocuments: vi.fn().mockResolvedValue({
      documents: [],
      chunks: [],
    }),
    deleteDocuments: vi.fn().mockResolvedValue(undefined),
    getDocuments: vi.fn().mockResolvedValue([]),
  })),
  createRAG: vi.fn(),
}));

// Mock @mastra/observability if it exists (optional dependency)
vi.mock("@mastra/observability", () => ({
  Observability: vi.fn().mockImplementation(() => ({
    createTrace: vi.fn().mockReturnValue({
      id: "mock-trace-id",
      startSpan: vi.fn(),
      endSpan: vi.fn(),
      addEvent: vi.fn(),
      setAttribute: vi.fn(),
    }),
    recordMetric: vi.fn(),
    createCounter: vi.fn(),
    createGauge: vi.fn(),
    createHistogram: vi.fn(),
  })),
  createObservability: vi.fn(),
}));

// Global test utilities
global.fetch = vi.fn();

if (!global.crypto) {
  (global as any).crypto = {};
}
(global.crypto as any).randomUUID = () =>
  "test-uuid-" + Math.random().toString(36).substr(2, 9);

// Preserve the original performance object and only mock specific methods
const originalPerformance = global.performance;
global.performance = Object.create(originalPerformance, {
  now: {
    value: vi.fn(() => Date.now()),
    writable: true,
    configurable: true,
  },
});

// Store original console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  log: console.log,
};

global.console = {
  ...global.console,
  // Mock console methods for testing error handling
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Reset fetch mock
  if (global.fetch) {
    (global.fetch as any).mockClear();
  }
});

afterEach(() => {
  // Restore any timers
  vi.clearAllTimers();
  vi.useRealTimers();

  // Restore mocks
  vi.restoreAllMocks();

  // Clear module cache to prevent memory leaks
  vi.resetModules();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Cleanup on process exit
if (typeof process !== "undefined") {
  process.on("exit", () => {
    // Restore console
    Object.assign(console, originalConsole);
  });
}
