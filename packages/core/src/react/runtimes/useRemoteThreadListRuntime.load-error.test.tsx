// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useRemoteThreadListRuntime load recovery", () => {
  it("waits for reload after a failed class-path list when the controlled ID changes", async () => {
    const error = new Error("offline");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const list = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ threads: [] });
    const adapter = Object.assign(makeAdapter({ list }), {
      unstable_Provider: ({ children }: { children?: ReactNode }) => children,
    });
    let runtime: AssistantRuntime | undefined;
    const useThreadRuntime = () =>
      useExternalStoreRuntime({
        messages: EMPTY_MESSAGES,
        onNew: async () => {},
      } as never);
    const App = ({ threadId }: { threadId: string }) => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        threadId,
        runtimeHook: useThreadRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    const { rerender } = render(<App threadId="one" />);
    await waitFor(() =>
      expect(runtime!.threads.getState().loadError).toBe(error),
    );
    expect(list).toHaveBeenCalledTimes(1);

    rerender(<App threadId="two" />);
    await act(async () => {});
    expect(list).toHaveBeenCalledTimes(1);

    await act(async () => runtime!.threads.reload());
    expect(list).toHaveBeenCalledTimes(2);
    expect(runtime!.threads.getState().loadError).toBeUndefined();
  });

  it("reloads once when the browser comes online after a failed load", async () => {
    const error = new Error("offline");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const list = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ threads: [] });
    const adapter = makeAdapter({ list });
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };
    const useThreadRuntime = () =>
      useExternalStoreRuntime({
        messages: EMPTY_MESSAGES,
        onNew: async () => {},
      } as never);

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: useThreadRuntime,
      });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(runtimeRef.current!.threads.getState().loadError).toBe(error),
    );

    act(() => window.dispatchEvent(new Event("online")));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(list).toHaveBeenCalledTimes(2);
    expect(runtimeRef.current!.threads.getState().loadError).toBeUndefined();
  });

  it("reloads once when the page becomes visible after a failed load", async () => {
    const error = new Error("offline");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const list = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ threads: [] });
    const adapter = makeAdapter({ list });
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };
    const useThreadRuntime = () =>
      useExternalStoreRuntime({
        messages: EMPTY_MESSAGES,
        onNew: async () => {},
      } as never);

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: useThreadRuntime,
      });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(runtimeRef.current!.threads.getState().loadError).toBe(error),
    );

    act(() => document.dispatchEvent(new Event("visibilitychange")));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(runtimeRef.current!.threads.getState().loadError).toBeUndefined(),
    );

    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => {});

    expect(list).toHaveBeenCalledTimes(2);
  });
});
