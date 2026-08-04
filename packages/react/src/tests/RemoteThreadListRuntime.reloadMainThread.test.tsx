// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { type FC, useEffect } from "react";
import { describe, expect, it } from "vitest";
import {
  useRemoteThreadListRuntime,
  type AssistantRuntime,
} from "@assistant-ui/core/react";
import { makeAdapter } from "./remote-thread-list-test-helpers";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { AssistantRuntimeProvider } from "../context";
import type { ChatModelAdapter } from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const renderThreadList = async (mounts: { count: number }) => {
  const capture: { runtime: AssistantRuntime | null } = { runtime: null };

  const adapter = makeAdapter({
    list: async () => ({
      threads: [
        {
          status: "regular" as const,
          remoteId: "t-1",
          externalId: "t-1",
          title: "Open",
        },
      ],
    }),
  });

  const Inner: FC = () => {
    const runtime = useRemoteThreadListRuntime({
      runtimeHook: function useTestRuntimeHook() {
        useEffect(() => {
          mounts.count++;
        }, []);
        return useLocalRuntime(noOpAdapter);
      },
      adapter,
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };

  await act(async () => {
    render(<Inner />);
  });
  await waitFor(() => expect(capture.runtime).not.toBeNull());
  return capture;
};

// binders mount asynchronously, so a snapshot taken too early attributes a
// still-pending mount to whatever ran next
const settle = async (mounts: { count: number }) => {
  let previous = -1;
  await waitFor(() => {
    const seen = mounts.count;
    const stable = seen === previous;
    previous = seen;
    expect(stable).toBe(true);
  });
  return mounts.count;
};

describe("threads.reloadMainThread", () => {
  it("remounts the runtime hook of the open thread", async () => {
    const mounts = { count: 0 };
    const capture = await renderThreadList(mounts);
    const runtime = capture.runtime!;

    await act(async () => {
      await runtime.threads.switchToThread("t-1");
    });
    const beforeReload = await settle(mounts);
    expect(beforeReload).toBeGreaterThan(0);

    await act(async () => {
      await runtime.threads.reloadMainThread();
    });

    // the hook ran again, which is what re-runs the adapter's load()
    await waitFor(() => expect(mounts.count).toBe(beforeReload + 1));
  });

  it("keeps a thread runtime readable across the remount", async () => {
    const mounts = { count: 0 };
    const capture = await renderThreadList(mounts);
    const runtime = capture.runtime!;

    await act(async () => {
      await runtime.threads.switchToThread("t-1");
    });

    const seen: boolean[] = [];
    const unsubscribe = runtime.threads.subscribe(() => {
      seen.push(runtime.threads.getState().mainThreadId === "t-1");
    });

    await act(async () => {
      await runtime.threads.reloadMainThread();
    });
    unsubscribe();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
  });
});
