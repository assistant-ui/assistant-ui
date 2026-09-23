// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("useRemoteThreadListRuntime reload", () => {
  it("hides a thread the reloaded list no longer returns and still opens it", async () => {
    const error = vi.spyOn(console, "error");
    let calls = 0;
    const adapter = makeAdapter({
      list: vi.fn(async () => {
        calls++;
        return calls === 1
          ? {
              threads: [
                { status: "regular" as const, remoteId: "t1" },
                { status: "regular" as const, remoteId: "t2" },
              ],
            }
          : { threads: [{ status: "regular" as const, remoteId: "t1" }] };
      }),
    });
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
    await waitFor(() =>
      expect(runtimeRef.current!.threads.getState().threadIds).toEqual([
        "t1",
        "t2",
      ]),
    );
    const threads = () => runtimeRef.current!.threads;

    await act(() => threads().reload());

    expect(threads().getState().threadIds).toEqual(["t1"]);
    expect(Object.keys(threads().getState().threadItems)).not.toContain("t2");
    expect(() => threads().getItemById("t2")).toThrow();

    await act(() => threads().switchToThread("t2"));

    await waitFor(() =>
      expect(threads().mainItem.getState().remoteId).toBe("t2"),
    );
    expect(threads().getItemById("t2").getState().isMain).toBe(true);
    expect(adapter.fetch).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
