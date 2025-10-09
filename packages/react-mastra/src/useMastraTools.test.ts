import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMastraTools, useMastraToolsWithRetry } from "./useMastraTools";
import { MastraToolConfig } from "./types";

// Mock uuid module
vi.mock("uuid", () => ({
  v4: () => "test-execution-id",
}));

// Global tool definitions for all tests
const mockTool: MastraToolConfig = {
  id: "test-tool",
  name: "Test Tool",
  description: "A test tool",
  parameters: {} as any,
  execute: vi.fn().mockResolvedValue({
    success: true,
    data: "Tool executed successfully",
    executionTime: 100,
  }),
};

const mockFailingTool: MastraToolConfig = {
  id: "failing-tool",
  name: "Failing Tool",
  description: "A tool that fails",
  parameters: {} as any,
  execute: vi.fn().mockRejectedValue(new Error("Tool execution failed")),
};

describe("useMastraTools", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useMastraTools());

    expect(result.current.tools.size).toBe(0);
    expect(result.current.executions.size).toBe(0);
    expect(result.current.isExecuting).toBe(false);
  });

  it("should register and execute tools", async () => {
    const { result } = renderHook(() => useMastraTools());

    await act(async () => {
      result.current.registerTool(mockTool);
    });

    expect(result.current.tools.has("test-tool")).toBe(true);
    expect(result.current.tools.get("test-tool")).toEqual(mockTool);

    await act(async () => {
      const executionId = await result.current.executeTool("test-tool", { input: "test" });
      expect(executionId).toBeDefined();
    });

    expect(mockTool.execute).toHaveBeenCalledWith({ input: "test" });
  });

  it("should handle tool execution failures", async () => {
    const { result } = renderHook(() => useMastraTools());

    await act(async () => {
      result.current.registerTool(mockFailingTool);
    });

    await act(async () => {
      try {
        await result.current.executeTool("failing-tool", {});
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  it("should register and unregister tools", () => {
    const { result } = renderHook(() => useMastraTools());

    act(() => {
      result.current.registerTool(mockTool);
    });

    expect(result.current.tools.has("test-tool")).toBe(true);

    act(() => {
      result.current.unregisterTool("test-tool");
    });

    expect(result.current.tools.has("test-tool")).toBe(false);
  });

  it("should get tool by ID", () => {
    const { result } = renderHook(() => useMastraTools());

    act(() => {
      result.current.registerTool(mockTool);
    });

    const tool = result.current.getTool("test-tool");
    expect(tool).toBe(mockTool);

    const nonExistentTool = result.current.getTool("non-existent");
    expect(nonExistentTool).toBeUndefined();
  });

  it("should clear execution history", () => {
    const { result } = renderHook(() => useMastraTools());

    act(() => {
      result.current.registerTool(mockTool);
    });

    act(() => {
      result.current.clearExecutions();
    });

    expect(result.current.executions.size).toBe(0);
  });
});

describe("useMastraToolsWithRetry", () => {
  const mockRetryTool: MastraToolConfig = {
    id: "retry-tool",
    name: "Retry Tool",
    description: "A tool with retry policy",
    parameters: {} as any,
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      baseDelay: 100,
    },
    execute: vi.fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockResolvedValueOnce({
        success: true,
        data: "Success after retries",
        executionTime: 300,
      }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retry tool execution on failure", async () => {
    const { result } = renderHook(() => useMastraToolsWithRetry());

    await act(async () => {
      result.current.registerTool(mockRetryTool);
    });

    const executionId = await act(async () => {
      return await result.current.executeToolWithRetry("retry-tool", {});
    });

    expect(executionId).toBeDefined();
    expect(mockRetryTool.execute).toHaveBeenCalledTimes(2); // Called 2 times due to retry
  });
});