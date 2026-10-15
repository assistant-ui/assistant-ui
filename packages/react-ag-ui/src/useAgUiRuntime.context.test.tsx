// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { HttpAgent, RunAgentParameters } from "@ag-ui/client";
import { useAgUiRuntime } from "./useAgUiRuntime";

const createAgent = () => {
  const runAgent = vi.fn(async (_input: RunAgentParameters) => {});
  return {
    agent: { runAgent, abortRun: vi.fn() } as unknown as HttpAgent,
    runAgent,
  };
};

const send = async (
  runtime: ReturnType<typeof useAgUiRuntime>,
  text: string,
) => {
  await act(async () => {
    await runtime.thread.append({
      role: "user",
      content: [{ type: "text", text }],
    });
  });
};

afterEach(cleanup);

describe("useAgUiRuntime run context", () => {
  it("appends run context entries after the system entry in order", async () => {
    const { agent, runAgent } = createAgent();
    const getRunContext = vi.fn(() => [
      { description: "account", value: "123" },
      { description: "locale", value: "en-US" },
    ]);
    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, getRunContext }),
    );
    result.current.registerModelContextProvider({
      getModelContext: () => ({ system: "Be helpful" }),
    });

    await send(result.current, "hello");

    expect(getRunContext).toHaveBeenCalledOnce();
    expect(runAgent.mock.calls[0]?.[0].context).toEqual([
      { description: "system", value: "Be helpful" },
      { description: "account", value: "123" },
      { description: "locale", value: "en-US" },
    ]);
  });

  it("keeps the previous context with no getter", async () => {
    const { agent, runAgent } = createAgent();
    const { result } = renderHook(() => useAgUiRuntime({ agent }));

    await send(result.current, "first");
    expect(runAgent.mock.calls[0]?.[0].context).toEqual([]);

    result.current.registerModelContextProvider({
      getModelContext: () => ({ system: "Be helpful" }),
    });
    await send(result.current, "second");
    expect(runAgent.mock.calls[1]?.[0].context).toEqual([
      { description: "system", value: "Be helpful" },
    ]);
  });

  it("runs without host entries when the getter throws", async () => {
    const { agent, runAgent } = createAgent();
    const onError = vi.fn();
    const loggerError = vi.fn();
    const getRunContext = vi.fn(() => {
      throw "context unavailable";
    });
    const { result } = renderHook(() =>
      useAgUiRuntime({
        agent,
        getRunContext,
        onError,
        logger: { error: loggerError },
      }),
    );
    result.current.registerModelContextProvider({
      getModelContext: () => ({ system: "Be helpful" }),
    });

    await send(result.current, "hello");

    expect(getRunContext).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
    expect(onError.mock.calls[0]?.[0].message).toBe("context unavailable");
    expect(loggerError).toHaveBeenCalledExactlyOnceWith(
      "[agui] getRunContext failed",
      onError.mock.calls[0]?.[0],
    );
    expect(runAgent).toHaveBeenCalledOnce();
    expect(runAgent.mock.calls[0]?.[0].context).toEqual([
      { description: "system", value: "Be helpful" },
    ]);
  });

  it("uses the latest getter on the next run", async () => {
    const { agent, runAgent } = createAgent();
    const first = vi.fn(() => [{ description: "account", value: "one" }]);
    const second = vi.fn(() => [{ description: "account", value: "two" }]);
    const { result, rerender } = renderHook(
      ({ getRunContext }) => useAgUiRuntime({ agent, getRunContext }),
      { initialProps: { getRunContext: first } },
    );

    await send(result.current, "first");
    rerender({ getRunContext: second });
    await send(result.current, "second");

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(runAgent.mock.calls.map(([input]) => input.context)).toEqual([
      [{ description: "account", value: "one" }],
      [{ description: "account", value: "two" }],
    ]);
  });

  it("calls the getter again when resuming a run", async () => {
    const runAgent = vi.fn(
      async (
        _input: RunAgentParameters,
        subscriber: {
          onRunFinishedEvent?: (params: unknown) => unknown;
          onRunFinalized?: (params: unknown) => unknown;
        },
      ) => {
        if (runAgent.mock.calls.length === 1) {
          subscriber.onRunFinishedEvent?.({
            event: {
              type: "RUN_FINISHED",
              runId: "first",
              outcome: {
                type: "interrupt",
                interrupts: [{ id: "input", reason: "input_required" }],
              },
            },
          });
        }
        subscriber.onRunFinalized?.(undefined);
      },
    );
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const getRunContext = vi
      .fn()
      .mockReturnValueOnce([{ description: "account", value: "before" }])
      .mockReturnValueOnce([{ description: "account", value: "after" }]);
    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, getRunContext }),
    );

    await send(result.current, "first");
    await act(async () => {
      await result.current.unstable_submitInterruptResponses([
        { interruptId: "input", status: "resolved", payload: "answer" },
      ]);
    });

    expect(getRunContext).toHaveBeenCalledTimes(2);
    expect(runAgent.mock.calls.map(([input]) => input.context)).toEqual([
      [{ description: "account", value: "before" }],
      [{ description: "account", value: "after" }],
    ]);
    expect(runAgent.mock.calls[1]?.[0].resume).toEqual([
      { interruptId: "input", status: "resolved", payload: "answer" },
    ]);
  });

  it("sends an interrupt response when the resume getter throws", async () => {
    const runAgent = vi.fn(
      async (
        _input: RunAgentParameters,
        subscriber: {
          onRunFinishedEvent?: (params: unknown) => unknown;
          onRunFinalized?: (params: unknown) => unknown;
        },
      ) => {
        if (runAgent.mock.calls.length === 1) {
          subscriber.onRunFinishedEvent?.({
            event: {
              type: "RUN_FINISHED",
              runId: "first",
              outcome: {
                type: "interrupt",
                interrupts: [{ id: "input", reason: "input_required" }],
              },
            },
          });
        }
        subscriber.onRunFinalized?.(undefined);
      },
    );
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const error = new Error("context unavailable");
    const onError = vi.fn();
    const getRunContext = vi
      .fn()
      .mockReturnValueOnce([{ description: "account", value: "before" }])
      .mockImplementationOnce(() => {
        throw error;
      });
    const { result } = renderHook(() =>
      useAgUiRuntime({ agent, getRunContext, onError }),
    );

    await send(result.current, "first");
    await act(async () => {
      await result.current.unstable_submitInterruptResponses([
        { interruptId: "input", status: "resolved", payload: "answer" },
      ]);
    });

    expect(getRunContext).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(runAgent.mock.calls[1]?.[0].context).toEqual([]);
    expect(runAgent.mock.calls[1]?.[0].resume).toEqual([
      { interruptId: "input", status: "resolved", payload: "answer" },
    ]);
  });
});
