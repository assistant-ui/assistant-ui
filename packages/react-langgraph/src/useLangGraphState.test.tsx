import { act, renderHook, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  useLangGraphState,
  useLangGraphSetState,
  useLangGraphSend,
} from "./hooks";
import { mockStreamCallbackFactory } from "./testUtils";
import type { LangGraphStreamCallback } from "./useLangGraphMessages";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import type { LangChainMessage } from "./types";

const wrapperFactory = (runtime: AssistantRuntime) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

const humanMessage = {
  type: "human" as const,
  content: "Hello",
};

const renderAgentState = (
  stream: LangGraphStreamCallback<LangChainMessage>,
) => {
  const { result: runtimeResult } = renderHook(() =>
    useLangGraphRuntime({ stream }),
  );
  const wrapper = wrapperFactory(runtimeResult.current);
  return renderHook(
    () => ({
      state: useLangGraphState(),
      setState: useLangGraphSetState(),
      send: useLangGraphSend(),
    }),
    { wrapper },
  );
};

const waitForRuntime = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("useLangGraphState", () => {
  it("reflects top-level values events", async () => {
    const values = { count: 1, status: "ready" };
    const stream = vi.fn(() =>
      mockStreamCallbackFactory([{ event: "values", data: values }])(),
    );
    const { result } = renderAgentState(stream);
    await waitForRuntime();

    await act(async () => {
      await result.current.send([humanMessage], {});
    });

    await waitFor(() => {
      expect(result.current.state).toEqual(values);
    });
  });

  it("applies optimistic state and sends it with the next run", async () => {
    const stream = vi.fn(() => mockStreamCallbackFactory([])());
    const { result } = renderAgentState(stream);
    await waitForRuntime();

    act(() => {
      result.current.setState({ count: 2 });
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({ count: 2 });
    });

    await act(async () => {
      await result.current.send([humanMessage], {});
    });

    expect(stream).toHaveBeenCalledWith(
      [expect.objectContaining(humanMessage)],
      expect.objectContaining({ state: { count: 2 } }),
    );
  });

  it("replaces the optimistic overlay with fresh values", async () => {
    const stream = vi
      .fn()
      .mockImplementationOnce(() =>
        mockStreamCallbackFactory([
          { event: "values", data: { count: 1, status: "initial" } },
        ])(),
      )
      .mockImplementationOnce(() =>
        mockStreamCallbackFactory([
          { event: "values", data: { count: 3, status: "fresh" } },
        ])(),
      );
    const { result } = renderAgentState(stream);
    await waitForRuntime();

    await act(async () => {
      await result.current.send([humanMessage], {});
    });

    act(() => {
      result.current.setState((state) => ({
        ...state,
        count: 2,
      }));
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        count: 2,
        status: "initial",
      });
    });

    await act(async () => {
      await result.current.send([humanMessage], {});
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        count: 3,
        status: "fresh",
      });
    });
  });

  it("composes chained functional setState updaters in the same act", async () => {
    const stream = vi.fn(() => mockStreamCallbackFactory([])());
    const { result } = renderAgentState(stream);
    await waitForRuntime();

    act(() => {
      result.current.setState({ count: 0 });
      result.current.setState((prev) => ({
        count: ((prev?.count as number | undefined) ?? 0) + 1,
      }));
      result.current.setState((prev) => ({
        count: ((prev?.count as number | undefined) ?? 0) + 1,
      }));
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({ count: 2 });
    });

    await act(async () => {
      await result.current.send([humanMessage], {});
    });

    expect(stream).toHaveBeenCalledWith(
      [expect.objectContaining(humanMessage)],
      expect.objectContaining({ state: { count: 2 } }),
    );
  });
});
