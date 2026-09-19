// @vitest-environment jsdom

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { HttpAgent } from "@ag-ui/client";
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

describe("useAgUiRuntime active runs during thread switching", () => {
  it.each([
    { destination: "existing", hasQueuedSend: false },
    { destination: "new", hasQueuedSend: false },
    { destination: "existing", hasQueuedSend: true },
    { destination: "new", hasQueuedSend: true },
  ])(
    "keeps a queued onCancel replacement on the original thread when switching to $destination with hasQueuedSend=$hasQueuedSend",
    async ({ destination, hasQueuedSend }) => {
      const { agent, signals, started } = pendingAgent();
      const load = vi.fn(async (id: string) => ({ messages: [message(id)] }));
      const create = vi.fn(async () => {});
      let runtime!: ReturnType<typeof useAgUiRuntime>;
      const { result } = renderHook(() => {
        const [threadId, setThreadId] = useState("initial");
        runtime = useAgUiRuntime({
          agent,
          unstable_enableMessageQueue: true,
          onCancel: () => {
            if (signals.length === 1) {
              runtime.thread.append("replacement");
            }
          },
          adapters: {
            threadList: {
              threadId,
              onSwitchToThread: (id) => {
                setThreadId(id);
                return load(id);
              },
              onSwitchToNewThread: () => {
                setThreadId("new-thread");
                return create();
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
      if (hasQueuedSend) {
        await act(async () => {
          result.current.thread.composer.setText("queued-for-old-thread");
          result.current.thread.composer.send({ steer: false });
        });
      }
      const queuedBeforeSwitch =
        result.current.thread.composer.getState().queue;
      expect(queuedBeforeSwitch.map((item) => item.prompt)).toEqual(
        hasQueuedSend ? ["queued-for-old-thread"] : [],
      );
      await act(async () => {
        if (destination === "existing") {
          await result.current.threads.switchToThread("superseded-thread");
        } else {
          await result.current.threads.switchToNewThread();
        }
      });

      expect(load).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(result.current.threads.getState().mainThreadId).toBe("initial");
      expect(result.current.thread.composer.getState().queue).toEqual(
        queuedBeforeSwitch,
      );
      expect(signals).toHaveLength(2);
      expect(signals[0]?.aborted).toBe(true);
      expect(signals[1]?.aborted).toBe(false);
      expect(
        result.current.thread
          .getState()
          .messages.findLast((m) => m.role === "user")?.content,
      ).toEqual([{ type: "text", text: "replacement" }]);
      expect(result.current.thread.getState().isRunning).toBe(true);
    },
  );

  it.each(["existing", "new"])(
    "preserves a same-length queue replacement before switching to %s",
    async (destination) => {
      const { agent, started } = pendingAgent();
      const load = vi.fn(async () => ({ messages: [] }));
      const create = vi.fn(async () => {});
      const { result } = renderHook(() => {
        const [threadId, setThreadId] = useState("initial");
        return useAgUiRuntime({
          agent,
          unstable_enableMessageQueue: true,
          onCancel: () => {
            const composer = result.current.thread.composer;
            const original = composer.getState().queue[0];
            if (!original) return;
            composer.removeQueueItem(original.id);
            composer.setText("callback-replacement");
            composer.send({ steer: false });
          },
          adapters: {
            threadList: {
              threadId,
              onSwitchToThread: (id) => {
                setThreadId(id);
                return load();
              },
              onSwitchToNewThread: () => {
                setThreadId("new-thread");
                return create();
              },
            },
          },
        });
      });
      act(() => {
        result.current.thread.append("hello");
      });
      await started;
      await act(async () => {
        result.current.thread.composer.setText("old-queued");
        result.current.thread.composer.send({ steer: false });
      });
      expect(result.current.thread.composer.getState().queue).toHaveLength(1);
      await act(async () => {
        if (destination === "existing")
          await result.current.threads.switchToThread("other");
        else await result.current.threads.switchToNewThread();
      });
      expect(load).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(result.current.threads.getState().mainThreadId).toBe("initial");
      expect(
        result.current.thread
          .getState()
          .messages.findLast((m) => m.role === "user")?.content,
      ).toEqual([{ type: "text", text: "callback-replacement" }]);
      expect(result.current.thread.getState().isRunning).toBe(true);
    },
  );

  it.each(["existing", "new"])(
    "switches to %s even when the agent abort hook throws",
    async (destination) => {
      const { agent, started } = pendingAgent();
      const abortRun = agent.abortRun.bind(agent);
      const abortError = new Error("agent abort failed");
      vi.spyOn(agent, "abortRun").mockImplementation(() => {
        abortRun();
        throw abortError;
      });
      const logger = { error: vi.fn() };
      const { result } = renderHook(() => {
        const [threadId, setThreadId] = useState("initial");
        return useAgUiRuntime({
          agent,
          logger,
          adapters: {
            threadList: {
              threadId,
              onSwitchToThread: async (id) => {
                setThreadId(id);
                return { messages: [message(id)] };
              },
              onSwitchToNewThread: async () => {
                setThreadId("new-thread");
              },
            },
          },
        });
      });
      act(() => {
        result.current.thread.append("hello");
      });
      const signal = await started;
      await act(async () => {
        if (destination === "existing") {
          await result.current.threads.switchToThread("other-thread");
        } else {
          await result.current.threads.switchToNewThread();
        }
      });

      expect(signal.aborted).toBe(true);
      expect(result.current.thread.getState().isRunning).toBe(false);
      expect(result.current.threads.getState().mainThreadId).toBe(
        destination === "existing" ? "other-thread" : "new-thread",
      );
      expect(
        result.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(destination === "existing" ? ["other-thread"] : []);
      expect(logger.error).toHaveBeenCalledWith(
        "[agui] agent abortRun failed",
        abortError,
      );
    },
  );

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
