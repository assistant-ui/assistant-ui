import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMastraRuntime } from "./useMastraRuntime";

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

  it("should handle errors when provided", async () => {
    const onError = vi.fn();
    const config = {
      agentId: "test-agent",
      api: "http://invalid-url",
      eventHandlers: {
        onError,
      },
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    // Mock fetch to simulate an error
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    // Trigger a message send which should call onError
    const runtime = result.current;
    await runtime.thread.append({
      role: "user",
      content: [{ type: "text", text: "test" }],
    });

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify onError was called
    expect(onError).toHaveBeenCalled();
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
