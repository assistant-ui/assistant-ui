import type { MastraClient } from "@mastra/client-js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMastraWorkflow } from "./useMastraWorkflow";

const success = (result: Record<string, unknown>) => ({
  status: "success" as const,
  input: {},
  result,
  steps: {},
});

const suspended = (stepId: string, payload: Record<string, unknown>) => ({
  status: "suspended" as const,
  input: {},
  steps: {
    [stepId]: { status: "suspended", suspendPayload: payload },
  },
  suspendPayload: payload,
  suspended: [[stepId]],
  resumeLabels: { approval: { stepId } },
});

const failed = (message: string) => ({
  status: "failed" as const,
  input: {},
  steps: {},
  error: new Error(message),
});

const createClient = () => {
  const run = {
    runId: "run-1",
    startAsync: vi.fn(),
    resumeAsync: vi.fn(),
    cancel: vi.fn(async () => ({ message: "Workflow run canceled" })),
  };
  const workflow = {
    createRun: vi.fn(async () => run),
    runById: vi.fn(),
  };
  const client = {
    getWorkflow: vi.fn(() => workflow),
  } as unknown as MastraClient;
  return { client, workflow, run };
};

describe("useMastraWorkflow", () => {
  it("starts a run and stores its successful result", async () => {
    const { client, workflow, run } = createClient();
    const onRunIdChange = vi.fn();
    run.startAsync.mockResolvedValue(success({ approved: true }));
    const { result } = renderHook(() =>
      useMastraWorkflow<
        { request: string },
        { approved: boolean },
        { approved: boolean }
      >({
        client,
        workflowId: "approval",
        resourceId: "user-1",
        onRunIdChange,
      }),
    );

    await act(async () => {
      await result.current.start({ request: "Review" });
    });

    expect(workflow.createRun).toHaveBeenCalledWith({ resourceId: "user-1" });
    expect(run.startAsync).toHaveBeenCalledWith({
      inputData: { request: "Review" },
      initialState: undefined,
      requestContext: undefined,
    });
    expect(onRunIdChange).toHaveBeenCalledWith("run-1");
    expect(result.current.state).toMatchObject({
      runId: "run-1",
      status: "success",
      result: { approved: true },
    });
  });

  it("represents a returned workflow failure", async () => {
    const { client, run } = createClient();
    run.startAsync.mockResolvedValue(failed("step failed"));
    const { result } = renderHook(() =>
      useMastraWorkflow({ client, workflowId: "approval" }),
    );

    await act(async () => {
      await result.current.start({});
    });

    expect(result.current.state.status).toBe("failed");
    expect(result.current.state.error?.message).toBe("step failed");
  });

  it("supports a second suspension and resume in the same run", async () => {
    const { client, workflow, run } = createClient();
    run.startAsync.mockResolvedValue(
      suspended("screening-approval", { score: 8 }),
    );
    run.resumeAsync
      .mockResolvedValueOnce(
        suspended("interview-approval", { recommendation: "hire" }),
      )
      .mockResolvedValueOnce(success({ hired: true }));
    const { result } = renderHook(() =>
      useMastraWorkflow<
        Record<string, unknown>,
        { approved: boolean },
        { hired: boolean },
        Record<string, unknown>
      >({ client, workflowId: "hiring" }),
    );

    await act(async () => {
      await result.current.start({});
    });
    expect(result.current.state.suspendedSteps[0]).toEqual({
      stepId: "screening-approval",
      path: ["screening-approval"],
      forEachIndex: undefined,
      payload: { score: 8 },
    });

    await act(async () => {
      await result.current.resume(result.current.state.suspendedSteps[0]!, {
        approved: true,
      });
    });
    expect(result.current.state.suspendedSteps[0]?.stepId).toBe(
      "interview-approval",
    );

    await act(async () => {
      await result.current.resume(result.current.state.suspendedSteps[0]!, {
        approved: true,
      });
    });

    expect(workflow.createRun).toHaveBeenLastCalledWith({
      runId: "run-1",
      resourceId: undefined,
    });
    expect(run.resumeAsync).toHaveBeenNthCalledWith(1, {
      step: ["screening-approval"],
      resumeData: { approved: true },
      forEachIndex: undefined,
      requestContext: undefined,
    });
    expect(result.current.state).toMatchObject({
      status: "success",
      result: { hired: true },
      suspendedSteps: [],
    });
  });

  it("restores a persisted suspended run by run ID", async () => {
    const { client, workflow } = createClient();
    workflow.runById.mockResolvedValue({
      runId: "persisted-run",
      workflowName: "approval",
      status: "suspended",
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: {
        approval: {
          status: "suspended",
          suspendPayload: { question: "Ship it?" },
        },
      },
      resumeLabels: { approval: { stepId: "approval" } },
    });
    const { result } = renderHook(() =>
      useMastraWorkflow({
        client,
        workflowId: "approval",
        runId: "persisted-run",
      }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("suspended"));

    expect(workflow.runById).toHaveBeenCalledWith("persisted-run", {
      requestContext: undefined,
    });
    expect(result.current.state.suspendedSteps[0]).toMatchObject({
      stepId: "approval",
      payload: { question: "Ship it?" },
    });
  });

  it("cancels the current server run explicitly", async () => {
    const { client, run } = createClient();
    run.startAsync.mockResolvedValue(suspended("approval", {}));
    const { result } = renderHook(() =>
      useMastraWorkflow({ client, workflowId: "approval" }),
    );
    await act(async () => {
      await result.current.start({});
    });

    await act(async () => {
      await result.current.cancel();
    });

    expect(run.cancel).toHaveBeenCalledOnce();
    expect(result.current.state.status).toBe("canceled");
  });

  it("does not cancel or commit a server run after unmount", async () => {
    const { client, run } = createClient();
    let resolveRun: ((value: ReturnType<typeof success>) => void) | undefined;
    run.startAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveRun = resolve;
      }),
    );
    const onStateChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMastraWorkflow({
        client,
        workflowId: "approval",
        onStateChange,
      }),
    );

    let startPromise: ReturnType<typeof result.current.start> | undefined;
    act(() => {
      startPromise = result.current.start({});
    });
    await waitFor(() => expect(result.current.state.status).toBe("running"));
    unmount();
    resolveRun?.(success({ done: true }));
    await startPromise;

    expect(run.cancel).not.toHaveBeenCalled();
    expect(onStateChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" }),
    );
  });
});
