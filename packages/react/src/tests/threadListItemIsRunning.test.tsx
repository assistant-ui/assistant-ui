// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { type FC, useEffect, useReducer } from "react";
import { describe, expect, it } from "vitest";
import {
  useRemoteThreadListRuntime,
  type AssistantRuntime,
} from "@assistant-ui/core/react";
import { makeAdapter } from "./remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../context";
import * as ThreadListPrimitive from "../primitives/threadList";
import { useAui, useAuiState } from "../index";
import { useExternalStoreRuntime } from "../legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime";

const Probe: FC = () => {
  const id = useAuiState((s) => s.threadListItem.id);
  const isRunning = useAuiState((s) => s.threadListItem.isRunning);
  return (
    <span data-testid={`item-${id}`}>{isRunning ? "running" : "idle"}</span>
  );
};

const Items: FC = () => (
  <ThreadListPrimitive.Items components={{ ThreadListItem: Probe }} />
);

describe("threadListItem.isRunning", () => {
  it("reports the run of a single-thread runtime that cannot observe background threads", async () => {
    const Inner: FC<{ isRunning: boolean }> = ({ isRunning }) => {
      const runtime = useExternalStoreRuntime({
        messages: [],
        isRunning,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Items />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(<Inner isRunning={false} />);
    await waitFor(() =>
      expect(screen.getByTestId("item-DEFAULT_THREAD_ID").textContent).toBe(
        "idle",
      ),
    );

    await act(async () => {
      view.rerender(<Inner isRunning />);
    });

    expect(screen.getByTestId("item-DEFAULT_THREAD_ID").textContent).toBe(
      "running",
    );
  });

  it("keeps reporting a thread the user switched away from as running", async () => {
    const running = new Map<string, boolean>();
    const listeners = new Set<() => void>();
    const setRunning = (threadId: string, value: boolean) => {
      running.set(threadId, value);
      for (const listener of listeners) listener();
    };

    const useTestRuntimeHook = () => {
      const aui = useAui();
      const threadId = aui.threadListItem.getState().id;
      const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
      useEffect(() => {
        listeners.add(forceUpdate);
        return () => {
          listeners.delete(forceUpdate);
        };
      }, []);

      return useExternalStoreRuntime({
        messages: [],
        isRunning: running.get(threadId) ?? false,
        onNew: async () => {},
      });
    };

    const adapter = makeAdapter({
      list: async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "t-1",
            externalId: "t-1",
            title: "First",
          },
          {
            status: "regular" as const,
            remoteId: "t-2",
            externalId: "t-2",
            title: "Second",
          },
        ],
      }),
    });

    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Inner: FC = () => {
      const runtime = useRemoteThreadListRuntime({
        runtimeHook: useTestRuntimeHook,
        adapter,
      });
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Items />
        </AssistantRuntimeProvider>
      );
    };

    await act(async () => {
      render(<Inner />);
    });
    await waitFor(() => expect(screen.getByTestId("item-t-1")).toBeTruthy());

    await act(async () => {
      await capture.runtime!.threads.switchToThread("t-1");
    });
    await act(async () => {
      setRunning("t-1", true);
    });
    await waitFor(() =>
      expect(screen.getByTestId("item-t-1").textContent).toBe("running"),
    );

    await act(async () => {
      await capture.runtime!.threads.switchToThread("t-2");
    });

    expect(screen.getByTestId("item-t-1").textContent).toBe("running");
    expect(screen.getByTestId("item-t-2").textContent).toBe("idle");

    await act(async () => {
      setRunning("t-1", false);
    });
    await waitFor(() =>
      expect(screen.getByTestId("item-t-1").textContent).toBe("idle"),
    );
  });
});
