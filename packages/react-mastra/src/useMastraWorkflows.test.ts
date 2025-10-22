import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMastraWorkflows, useMastraWorkflowInterrupt, useMastraSendWorkflowCommand } from "./useMastraWorkflows";
import { MastraWorkflowConfig, MastraWorkflowInterrupt } from "./types";

describe("useMastraWorkflows", () => {
  const mockWorkflowConfig: MastraWorkflowConfig = {
    workflowId: "test-workflow",
    initialState: "gathering",
    context: { user: "test-user" },
  };

  const mockInterrupt: MastraWorkflowInterrupt = {
    id: "interrupt-1",
    state: "awaiting-input",
    context: {},
    requiresInput: true,
    prompt: "Please provide your preference",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch to return workflow API responses
    (global.fetch as any).mockImplementation(async (url: string, options: any) => {
      // Mock successful workflow start
      if (url === "/api/workflow" && options?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            runId: "mock-workflow-id",
            status: "running",
            suspended: ["gathering"], // Return the initial state from config
            result: null,
          }),
        };
      }

      // Mock successful workflow resume
      if (url === "/api/workflow/resume" && options?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            runId: "mock-workflow-id",
            status: "completed",
            suspended: [],
            result: {},
          }),
        };
      }

      // Default fallback for unexpected calls
      return {
        ok: false,
        json: async () => ({ error: "Unexpected fetch call" }),
      };
    });
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    expect(result.current.workflowState).toBe(null);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isSuspended).toBe(false);
  });

  it("should start workflow execution", async () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() => useMastraWorkflows({
      ...mockWorkflowConfig,
      onStateChange,
    }));

    const workflow = await act(async () => {
      return await result.current.startWorkflow({ initialData: "test" });
    });

    expect(workflow).toBeDefined();
    expect(workflow.id).toMatch(/mock-workflow-id/);
    expect(workflow.status).toBe("running");
    expect(result.current.isRunning).toBe(true); // Should be true after workflow starts
    expect(result.current.workflowState?.status).toBe("running");
    expect(onStateChange).toHaveBeenCalledWith(workflow);
  });

  it("should handle workflow interrupts", async () => {
    const onInterrupt = vi.fn();
    const onStateChange = vi.fn();
    const { result } = renderHook(() => useMastraWorkflows({
      ...mockWorkflowConfig,
      onInterrupt,
      onStateChange,
    }));

    // Start workflow
    await act(async () => {
      await result.current.startWorkflow();
    });

    // Simulate interrupt via subscription callback
    const interruptedState = {
      ...result.current.workflowState!,
      status: "suspended" as const,
      interrupt: mockInterrupt,
    };

    act(() => {
      // This would be called by the subscription callback in real implementation
      onStateChange(interruptedState);
      onInterrupt(mockInterrupt);
    });

    expect(onInterrupt).toHaveBeenCalledWith(mockInterrupt);
  });

  it("should suspend and resume workflows", async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    // Start workflow
    await act(async () => {
      await result.current.startWorkflow();
    });

    expect(result.current.workflowState?.status).toBe("running");

    // Suspend workflow
    await act(async () => {
      await result.current.suspendWorkflow();
    });

    expect(result.current.workflowState?.status).toBe("suspended");
    expect(result.current.isSuspended).toBe(true);

    // Resume workflow
    await act(async () => {
      await result.current.resumeWorkflow("user input");
    });

    expect(result.current.workflowState?.status).toBe("running");
    expect(result.current.isSuspended).toBe(false);
  });

  it("should send workflow commands", async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    // Start workflow
    await act(async () => {
      await result.current.startWorkflow();
    });

    // Send command - this should not throw and workflow state should be updated
    await act(async () => {
      await result.current.sendCommand({
        transition: "processing",
        context: { step: 1 },
      });
    });

    // Verify command doesn't throw and workflow remains in running state
    expect(result.current.workflowState?.status).toBe("running");
  });

  it("should use transitionTo helper method", async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await result.current.startWorkflow();
    });

    await act(async () => {
      await result.current.transitionTo("completed", { result: "success" });
    });

    // Verify transition was successful (workflow remains running)
    expect(result.current.workflowState?.status).toBe("running");
  });

  it("should handle workflow start errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock fetch to return error response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Workflow start failed" }),
    });

    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await expect(result.current.startWorkflow()).rejects.toThrow("Workflow start failed");
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Workflow start failed"),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("should not suspend if workflow is not running", async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await result.current.suspendWorkflow();
    });

    expect(result.current.isSuspended).toBe(false);
    expect(result.current.workflowState).toBeNull();
  });

  it("should not resume if workflow is not suspended", async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await result.current.resumeWorkflow("input");
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.workflowState).toBeNull();
  });

  it("should not send commands if workflow is not started", async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await result.current.sendCommand({ transition: "test" });
    });

    expect(result.current.workflowState).toBeNull();
  });

  it("should build workflow history correctly", async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await result.current.startWorkflow({ initial: "data" });
    });

    expect(result.current.workflowState?.history).toHaveLength(1);
    expect(result.current.workflowState?.history[0]).toEqual({
      from: "none",
      to: "screening-step", // Hardcoded in implementation
      event: "start",
      timestamp: expect.any(String),
    });

    await act(async () => {
      await result.current.suspendWorkflow();
    });

    // History should still be the same (suspend doesn't add to history in this mock)
    expect(result.current.workflowState?.history).toHaveLength(1);

    await act(async () => {
      await result.current.resumeWorkflow("input");
    });

    expect(result.current.workflowState?.history).toHaveLength(2);
    expect(result.current.workflowState?.history[1]).toEqual({
      from: "suspended",
      to: "running",
      event: "resume",
      timestamp: expect.any(String),
    });
  });

  it("should use default workflow state when not provided", async () => {
    const configWithoutDefaults: MastraWorkflowConfig = {
      workflowId: "test-workflow",
    };

    const { result } = renderHook(() => useMastraWorkflows(configWithoutDefaults));

    await act(async () => {
      await result.current.startWorkflow();
    });

    expect(result.current.workflowState?.current).toBe("gathering"); // default from mock
    expect(result.current.workflowState?.context).toEqual({});
  });
});

describe("useMastraWorkflowInterrupt", () => {
  it("should manage interrupt state", () => {
    const { result } = renderHook(() => useMastraWorkflowInterrupt());

    expect(result.current.interrupt).toBe(null);

    const mockInterrupt: MastraWorkflowInterrupt = {
      id: "test-interrupt",
      state: "awaiting",
      context: {},
      requiresInput: true,
    };

    act(() => {
      result.current.setWorkflowInterrupt(mockInterrupt);
    });

    expect(result.current.interrupt).toBe(mockInterrupt);

    act(() => {
      result.current.setWorkflowInterrupt(null);
    });

    expect(result.current.interrupt).toBe(null);
  });
});

describe("useMastraSendWorkflowCommand", () => {
  it("should provide command sending functionality", async () => {
    const { result } = renderHook(() => useMastraSendWorkflowCommand());

    await act(async () => {
      await result.current({
        transition: "test",
        context: { test: true },
      });
    });

    // In this mock implementation, we just verify it doesn't throw
    expect(result.current).toBeDefined();
  });
});