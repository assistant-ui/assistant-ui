// @vitest-environment jsdom

import { useState } from "react";
import { HttpAgent } from "@ag-ui/client";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessage } from "@assistant-ui/core";
import { useAgUiRuntime } from "./useAgUiRuntime";

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

function pendingAgent() {
  const started = deferred<AbortSignal>();
  const signals: AbortSignal[] = [];
  const agent = new HttpAgent({
    url: "https://example.invalid",
    fetch: async (_url, init) => {
      const signal = init.signal;
      if (!signal) throw new Error("missing request signal");
      signals.push(signal);
      started.resolve(signal);
      return await new Promise<Response>((_, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          },
          { once: true },
        );
      });
    },
  });
  return { agent, signals, started: started.promise };
}

afterEach(cleanup);

describe("useAgUiRuntime active runs during thread switching", () => {
  it.each([
    { destination: "existing", queue: false },
    { destination: "new", queue: false },
    { destination: "existing", queue: true },
    { destination: "new", queue: true },
  ])(
    "aborts the previous request before loading $destination with queue=$queue",
    async ({ destination, queue }) => {
      const { agent, signals, started } = pendingAgent();
      const loading = deferred<void>();
      const { result } = renderHook(() => {
        const [threadId, setThreadId] = useState("initial");
        return useAgUiRuntime({
          agent,
          unstable_enableMessageQueue: queue,
          adapters: {
            threadList: {
              threadId,
              onSwitchToThread: async (id) => {
                setThreadId(id);
                await loading.promise;
                return { messages: [message(id)] };
              },
              onSwitchToNewThread: async () => {
                setThreadId("new-thread");
                await loading.promise;
              },
            },
          },
        });
      });

      act(() => {
        result.current.thread.append("hello");
      });
      const signal = await started;
      expect(signal.aborted).toBe(false);
      if (queue) {
        await act(async () => {
          result.current.thread.append("queued for the old thread");
        });
        expect(signals).toHaveLength(1);
      }

      let switching!: Promise<void>;
      await act(async () => {
        switching =
          destination === "existing"
            ? result.current.threads.switchToThread("other-thread")
            : result.current.threads.switchToNewThread();
      });
      try {
        expect(signal.aborted).toBe(true);
        expect(result.current.thread.getState().isRunning).toBe(false);
      } finally {
        await act(async () => {
          loading.resolve();
          await switching;
        });
      }

      expect(
        result.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(destination === "existing" ? ["other-thread"] : []);
      expect(signals).toHaveLength(1);
    },
  );

  it("keeps a newer selection started synchronously by onCancel", async () => {
    const { agent, started } = pendingAgent();
    const load = vi.fn(async (id: string) => ({ messages: [message(id)] }));
    let runtime!: ReturnType<typeof useAgUiRuntime>;
    const { result } = renderHook(() => {
      const [threadId, setThreadId] = useState("initial");
      runtime = useAgUiRuntime({
        agent,
        onCancel: () => {
          void runtime.threads.switchToThread("callback-thread");
        },
        adapters: {
          threadList: {
            threadId,
            onSwitchToThread: (id) => {
              setThreadId(id);
              return load(id);
            },
          },
        },
      });
      return runtime;
    });
    act(() => {
      result.current.thread.append("hello");
    });
    await started;
    await act(async () => {
      await result.current.threads.switchToThread("superseded-thread");
    });

    expect(load).toHaveBeenCalledExactlyOnceWith("callback-thread");
    expect(result.current.threads.getState().mainThreadId).toBe(
      "callback-thread",
    );
    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      "callback-thread",
    ]);
  });

  it("keeps a replacement run started synchronously by onCancel", async () => {
    const { agent, signals, started } = pendingAgent();
    const load = vi.fn(async (id: string) => ({ messages: [message(id)] }));
    let runtime!: ReturnType<typeof useAgUiRuntime>;
    const { result } = renderHook(() => {
      runtime = useAgUiRuntime({
        agent,
        onCancel: () => {
          if (signals.length === 1) runtime.thread.append("replacement");
        },
        adapters: {
          threadList: { threadId: "initial", onSwitchToThread: load },
        },
      });
      return runtime;
    });
    act(() => {
      result.current.thread.append("hello");
    });
    await started;
    await act(async () => {
      await result.current.threads.switchToThread("superseded-thread");
    });

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(result.current.threads.getState().mainThreadId).toBe("initial");
    expect(result.current.thread.getState().isRunning).toBe(true);
  });
});
