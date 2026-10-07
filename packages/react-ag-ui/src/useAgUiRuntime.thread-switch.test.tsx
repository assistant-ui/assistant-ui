// @vitest-environment jsdom

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { HttpAgent } from "@ag-ui/client";
import type { ThreadMessage } from "@assistant-ui/core";
import { AgUiThreadRuntimeCore } from "./runtime/AgUiThreadRuntimeCore";
import type {
  UseAgUiRuntimeOptions,
  UseAgUiThreadListAdapter,
} from "./runtime/types";
import { useAgUiRuntime } from "./useAgUiRuntime";

type ThreadLoad = Awaited<
  ReturnType<NonNullable<UseAgUiThreadListAdapter["onSwitchToThread"]>>
>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Subscriber = Record<string, ((payload: any) => void) | undefined>;

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
  agentOverride?: HttpAgent,
  options: Pick<
    UseAgUiRuntimeOptions,
    "onCancel" | "unstable_enableMessageQueue"
  > = {},
) {
  const agent = {
    runAgent: vi.fn(),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  const runtimeAgent = agentOverride ?? agent;
  return renderHook(() => {
    const [threadId, setThreadId] = useState("initial");
    return useAgUiRuntime({
      agent: runtimeAgent,
      ...options,
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
  it.each(["existing", "new"] as const)(
    "discards queued sends while switching to a %s thread",
    async (destination) => {
      const signals: AbortSignal[] = [];
      const runAgent = vi.fn(
        async (
          _input: unknown,
          _subscriber: Subscriber,
          options: { signal: AbortSignal },
        ) => {
          signals.push(options.signal);
          await new Promise<void>((resolve) =>
            options.signal.addEventListener("abort", () => resolve(), {
              once: true,
            }),
          );
        },
      );
      const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
      let result!: ReturnType<typeof renderRuntime>["result"];
      const onCancel = vi.fn(() => {
        void result.current.thread.append("queued from cancellation");
      });
      result = renderRuntime(
        async () => ({ messages: [message("loaded")] }),
        async () => {},
        agent,
        { onCancel, unstable_enableMessageQueue: true },
      ).result;

      act(() => {
        void result.current.thread.append("active");
      });
      await waitFor(() => expect(runAgent).toHaveBeenCalledOnce());
      await act(async () => {
        await result.current.thread.append({
          role: "user",
          content: [{ type: "text", text: "queued for old thread" }],
          parentId:
            result.current.thread.getState().messages.at(-1)?.id ?? null,
        });
      });
      expect(runAgent).toHaveBeenCalledOnce();

      await act(async () => {
        if (destination === "existing") {
          await result.current.threads.switchToThread("thread-a");
        } else {
          await result.current.threads.switchToNewThread();
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(onCancel).toHaveBeenCalledOnce();
      expect(signals[0]?.aborted).toBe(true);
      expect(runAgent).toHaveBeenCalledOnce();
      expect(result.current.thread.getState().isRunning).toBe(false);
      expect(result.current.thread.composer.getState().queue).toEqual([]);
      expect(result.current.threads.getState().mainThreadId).toBe(
        destination === "existing" ? "thread-a" : "thread-new",
      );
      expect(
        result.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(destination === "existing" ? ["loaded"] : []);
    },
  );

  it("skips a stale adapter call when cancellation starts a newer selection", async () => {
    const signals: AbortSignal[] = [];
    const runAgent = vi.fn(
      async (
        _input: unknown,
        _subscriber: Subscriber,
        options: { signal: AbortSignal },
      ) => {
        signals.push(options.signal);
        await new Promise<void>((resolve) =>
          options.signal.addEventListener("abort", () => resolve(), {
            once: true,
          }),
        );
      },
    );
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const load = vi.fn(async (id: string) => ({ messages: [message(id)] }));
    let switchToNewer = () => {};
    const { result } = renderRuntime(load, undefined, agent, {
      onCancel: () => switchToNewer(),
    });
    switchToNewer = () => {
      void result.current.threads.switchToThread("newer");
    };

    act(() => {
      void result.current.thread.append("active");
    });
    await waitFor(() => expect(runAgent).toHaveBeenCalledOnce());

    await act(async () => {
      await result.current.threads.switchToThread("stale");
    });
    await waitFor(() =>
      expect(result.current.threads.getState().mainThreadId).toBe("newer"),
    );

    expect(signals[0]?.aborted).toBe(true);
    expect(load).toHaveBeenCalledExactlyOnceWith("newer");
    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      "newer",
    ]);
  });

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

  it.each(["resolve", "reject"] as const)(
    "keeps a new thread empty after an active run when creation %s",
    async (outcome) => {
      const load = deferred<ThreadLoad>();
      const create = deferred<void>();
      const run = deferred<void>();
      let subscriber!: Subscriber;
      const runAgent = vi.fn(async (_input: unknown, next: Subscriber) => {
        subscriber = next;
        await run.promise;
      });
      const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
      const { result } = renderRuntime(
        () => load.promise,
        () => create.promise,
        agent,
      );

      let switchA!: Promise<void>;
      act(() => {
        switchA = result.current.threads.switchToThread("thread-a");
      });
      await act(async () => {
        load.resolve({ messages: [message("thread-a")] });
        await switchA;
      });
      expect(
        result.current.thread.export().messages.map((m) => m.message.id),
      ).toEqual(["thread-a"]);

      act(() => {
        void result.current.thread.append("still running");
      });
      await waitFor(() => expect(runAgent).toHaveBeenCalledOnce());

      let switchNew!: Promise<void>;
      act(() => {
        switchNew = result.current.threads.switchToNewThread();
      });
      expect(result.current.thread.export().messages).toEqual([]);
      await waitFor(() =>
        expect(result.current.threads.getState().mainThreadId).toBe(
          "thread-new",
        ),
      );

      await act(async () => {
        if (outcome === "resolve") {
          create.resolve();
          await switchNew;
        } else {
          create.reject(new Error("create failed"));
          await expect(switchNew).rejects.toThrow("create failed");
        }
      });

      act(() => {
        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [{ id: "late", role: "assistant", content: "too late" }],
          },
        });
      });
      expect(result.current.thread.export().messages).toEqual([]);

      await act(async () => {
        run.resolve();
        await runAgent.mock.results[0]!.value;
      });
      expect(agent.abortRun).toHaveBeenCalledOnce();
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
