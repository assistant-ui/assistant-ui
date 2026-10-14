// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import {
  actSettled,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];
const useThreadRuntime = () =>
  useExternalStoreRuntime({
    messages: EMPTY_MESSAGES,
    onNew: async () => {},
  } as never);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mount = async (adapter: RemoteThreadListAdapter, threadId: string) => {
  let runtime: AssistantRuntime | undefined;
  let aui: AssistantClient | undefined;
  const Capture = () => {
    const client = useAui();
    useEffect(() => {
      aui = client;
    }, [client]);
    return null;
  };
  const App = () => {
    const value = useRemoteThreadListRuntime({
      adapter,
      threadId,
      runtimeHook: useThreadRuntime,
    });
    useEffect(() => {
      runtime = value;
    }, [value]);
    return (
      <AssistantRuntimeProvider runtime={value}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  await waitFor(() => expect(aui).toBeDefined());
  return { runtime: runtime!, aui: aui! };
};

describe("useRemoteThreadListRuntime switch recovery", () => {
  it.each(["online", "visible"] as const)(
    "retries a failed controlled switch when the browser becomes %s",
    async (event) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("offline");
      const fetch = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ status: "regular", remoteId: "r5" });
      const { runtime, aui } = await mount(makeAdapter({ fetch }), "r5");
      const initialMain = runtime.threads.getState().mainThreadId;

      await waitFor(() =>
        expect(runtime.threads.getState().switchError).toEqual({
          threadId: "r5",
          error,
        }),
      );
      expect(aui.threads().getState().switchError).toEqual({
        threadId: "r5",
        error,
      });
      expect(runtime.threads.getState().mainThreadId).toBe(initialMain);

      if (event === "online") {
        act(() => window.dispatchEvent(new Event("online")));
      } else {
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
        act(() => document.dispatchEvent(new Event("visibilitychange")));
      }

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(runtime.threads.mainItem.getState().remoteId).toBe("r5"),
      );
      expect(runtime.threads.getState().switchError).toBeUndefined();
      expect(aui.threads().getState().switchError).toBeUndefined();
    },
  );

  it("does not retry a failure for a different thread than the controlled id", async () => {
    const error = new Error("missing");
    const fetch = vi.fn(async (id: string) => {
      if (id === "missing") throw error;
      return { status: "regular" as const, remoteId: id };
    });
    const { runtime } = await mount(makeAdapter({ fetch }), "r5");
    await waitFor(() =>
      expect(runtime.threads.mainItem.getState().remoteId).toBe("r5"),
    );

    await expect(
      actSettled(() => runtime.threads.switchToThread("missing")),
    ).rejects.toBe(error);
    expect(runtime.threads.getState().switchError).toEqual({
      threadId: "missing",
      error,
    });

    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => {});

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(runtime.threads.getState().switchError).toEqual({
      threadId: "missing",
      error,
    });
  });
});
