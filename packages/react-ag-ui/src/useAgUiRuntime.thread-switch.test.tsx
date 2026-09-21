// @vitest-environment jsdom

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { HttpAgent } from "@ag-ui/client";
import type { ThreadMessage } from "@assistant-ui/core";
import { AgUiThreadRuntimeCore } from "./runtime/AgUiThreadRuntimeCore";
import type { UseAgUiThreadListAdapter } from "./runtime/types";
import { useAgUiRuntime } from "./useAgUiRuntime";

type ThreadLoad = Awaited<
  ReturnType<NonNullable<UseAgUiThreadListAdapter["onSwitchToThread"]>>
>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function message(id: string): ThreadMessage {
  return {
    id,
    role: "user",
    content: [{ type: "text", text: id }],
    attachments: [],
    createdAt: new Date(0),
    metadata: { custom: {} },
  };
}

function renderRuntime(
  load: (id: string) => Promise<ThreadLoad>,
  create: () => Promise<void> = async () => {},
) {
  const agent = {
    runAgent: vi.fn(),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  return renderHook(() => {
    const [threadId, setThreadId] = useState("initial");
    return useAgUiRuntime({
      agent,
      adapters: {
        threadList: {
          threadId,
          onSwitchToThread: (id) => {
            setThreadId(id);
            return load(id);
          },
          onSwitchToNewThread: () => {
            setThreadId("thread-new");
            return create();
          },
        },
      },
    });
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAgUiRuntime thread switching", () => {
  it.each([undefined, { owner: "thread-a" }])(
    "ignores an older load and its resume request with state %j",
    async (state) => {
      const resume = vi
        .spyOn(AgUiThreadRuntimeCore.prototype, "resumeInFlightRun")
        .mockResolvedValue();
      const first = deferred<ThreadLoad>();
      const second = deferred<ThreadLoad>();
      const { result } = renderRuntime((id) =>
        id === "thread-a" ? first.promise : second.promise,
      );

      let switchA!: Promise<void>;
      let switchB!: Promise<void>;
      act(() => {
        switchA = result.current.threads.switchToThread("thread-a");
        switchB = result.current.threads.switchToThread("thread-b");
      });
      await act(async () => {
        second.resolve({
          messages: [message("thread-b")],
          state: { owner: "thread-b" },
        });
        await switchB;
      });
      await act(async () => {
        first.resolve({
          messages: [message("thread-a")],
          ...(state !== undefined && { state }),
          unstable_resume: true,
        });
        await switchA;
      });

      expect(result.current.threads.getState().mainThreadId).toBe("thread-b");
      expect(
        result.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(["thread-b"]);
      expect(result.current.thread.getState().state).toEqual({
        owner: "thread-b",
      });
      expect(resume).not.toHaveBeenCalled();
    },
  );

  it("ignores a load superseded by creating a new thread", async () => {
    const resume = vi
      .spyOn(AgUiThreadRuntimeCore.prototype, "resumeInFlightRun")
      .mockResolvedValue();
    const load = deferred<ThreadLoad>();
    const { result } = renderRuntime(() => load.promise);

    let switchA!: Promise<void>;
    act(() => {
      switchA = result.current.threads.switchToThread("thread-a");
    });
    await act(async () => {
      await result.current.threads.switchToNewThread();
    });
    const newThreadState = result.current.thread.getState().state;
    await act(async () => {
      load.resolve({
        messages: [message("thread-a")],
        state: { owner: "thread-a" },
        unstable_resume: true,
      });
      await switchA;
    });

    expect(result.current.threads.getState().mainThreadId).toBe("thread-new");
    expect(result.current.thread.getState().messages).toEqual([]);
    expect(result.current.thread.getState().state).toEqual(newThreadState);
    expect(resume).not.toHaveBeenCalled();
  });

  it("does not clear a newer thread when an older creation finishes", async () => {
    const creation = deferred<void>();
    const { result } = renderRuntime(
      async () => ({
        messages: [message("thread-b")],
        state: { owner: "thread-b" },
      }),
      () => creation.promise,
    );

    let switchNew!: Promise<void>;
    act(() => {
      switchNew = result.current.threads.switchToNewThread();
    });
    await act(async () => {
      await result.current.threads.switchToThread("thread-b");
    });
    await act(async () => {
      creation.resolve();
      await switchNew;
    });

    expect(result.current.threads.getState().mainThreadId).toBe("thread-b");
    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      "thread-b",
    ]);
    expect(result.current.thread.getState().state).toEqual({
      owner: "thread-b",
    });
  });

  it("applies the current load and resumes it", async () => {
    const resume = vi
      .spyOn(AgUiThreadRuntimeCore.prototype, "resumeInFlightRun")
      .mockResolvedValue();
    const messages = [message("thread-a")];
    const { result } = renderRuntime(async () => ({
      messages,
      state: { owner: "thread-a" },
      unstable_resume: true,
    }));

    await act(async () => {
      await result.current.threads.switchToThread("thread-a");
    });

    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      "thread-a",
    ]);
    expect(result.current.thread.getState().state).toEqual({
      owner: "thread-a",
    });
    expect(resume).toHaveBeenCalledExactlyOnceWith(messages);
  });
});
