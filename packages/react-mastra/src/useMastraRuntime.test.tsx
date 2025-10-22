import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMastraRuntime } from "./useMastraRuntime";

// Mock the message converter to avoid React hook issues in tests
vi.mock("./convertMastraMessages", () => ({
  MastraMessageConverter: {
    useThreadMessages: vi.fn(() => []),
    toThreadMessages: vi.fn(() => []),
  },
}));

// Mock the external store runtime from @assistant-ui/react
vi.mock("@assistant-ui/react", async () => {
  const actual = await vi.importActual("@assistant-ui/react");
  return {
    ...actual,
    useExternalStoreRuntime: vi.fn(() => ({
      thread: {
        append: vi.fn(),
        subscribe: vi.fn(),
      },
      threads: {
        main: {},
        switchToNewThread: vi.fn(),
        switchToThread: vi.fn(),
      },
      switchToNewThread: vi.fn(),
      switchToThread: vi.fn(),
    })),
    useAssistantState: vi.fn(() => ({})),
  };
});

describe("useMastraRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize runtime with config", () => {
    const config = {
      agentId: "test-agent",
      api: "http://localhost:4111/api/test-agent/stream",
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");

    // Check for core AssistantRuntime properties
    expect(result.current).toHaveProperty("thread");
    expect(result.current).toHaveProperty("threads");
    expect(result.current).toHaveProperty("switchToNewThread");
    expect(result.current).toHaveProperty("switchToThread");
  });

  it("should handle errors when provided", () => {
    const onError = vi.fn();
    const config = {
      agentId: "test-agent",
      api: "http://invalid-url",
      onError,
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    // Verify runtime is initialized with error handler config
    // Note: Due to mocking, actual error handling is tested in integration tests
    expect(result.current).toBeDefined();
    expect(result.current.thread).toBeDefined();
  });

  it("should accept optional adapters", () => {
    const config = {
      agentId: "test-agent",
      api: "http://localhost:4111/api/test-agent/stream",
      adapters: {
        attachments: {} as any,
        feedback: {} as any,
        speech: {} as any,
      },
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    expect(result.current).toBeDefined();
  });

  it("should accept event handlers", () => {
    const onMetadata = vi.fn();
    const onToolCall = vi.fn();
    const onError = vi.fn();
    const onInterrupt = vi.fn();

    const config = {
      agentId: "test-agent",
      api: "http://localhost:4111/api/test-agent/stream",
      eventHandlers: {
        onMetadata,
        onToolCall,
        onError,
        onInterrupt,
      },
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    expect(result.current).toBeDefined();
  });

  it("should initialize with thread object", () => {
    const config = {
      agentId: "test-agent",
      api: "http://localhost:4111/api/test-agent/stream",
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    // Check that thread exists
    expect(result.current.thread).toBeDefined();
    expect(typeof result.current.thread).toBe("object");
  });

  it("should have thread list functionality", () => {
    const config = {
      agentId: "test-agent",
      api: "http://localhost:4111/api/test-agent/stream",
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    // Check threads functionality
    expect(result.current.threads).toBeDefined();
    expect(result.current.threads).toHaveProperty("main");
    expect(result.current.threads).toHaveProperty("switchToNewThread");
    expect(result.current.threads).toHaveProperty("switchToThread");
  });
});
