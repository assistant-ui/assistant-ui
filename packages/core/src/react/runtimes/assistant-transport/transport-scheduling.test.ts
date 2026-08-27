// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createElement, StrictMode, useLayoutEffect, useRef } from "react";
import { useCommandQueue } from "./commandQueue";
import { useRunManager } from "./runManager";
import type { AssistantTransportCommand } from "./types";

const createMessageCommand = (id: string): AssistantTransportCommand => ({
  type: "add-message",
  message: {
    role: "user",
    parts: [{ type: "text", text: id }],
  },
  parentId: null,
  sourceId: null,
});

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const captureUnhandledRejections = async (
  callback: () => Promise<void>,
): Promise<unknown[]> => {
  const reasons: unknown[] = [];
  const listener = (reason: unknown) => reasons.push(reason);
  process.on("unhandledRejection", listener);
  try {
    await callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return reasons;
  } finally {
    process.off("unhandledRejection", listener);
  }
};

const useTransportSchedulingHarness = (
  opts: {
    onRun?: (signal: AbortSignal) => Promise<void> | void;
    onCancel?: (commands: AssistantTransportCommand[]) => void;
    onError?: (commands: AssistantTransportCommand[]) => void | Promise<void>;
    onFinish?: () => void;
  } = {},
) => {
  const commandQueueRef = useRef<ReturnType<typeof useCommandQueue> | null>(
    null,
  );
  const runBatchesRef = useRef<AssistantTransportCommand[][]>([]);

  const runManager = useRunManager({
    onRun: async (signal) => {
      const batch = commandQueueRef.current!.flush();
      runBatchesRef.current.push(batch);
      await opts.onRun?.(signal);
    },
    onCancel: () => {
      const queue = commandQueueRef.current!;
      const commands = [...queue.state.inTransit, ...queue.state.queued];
      queue.reset();
      opts.onCancel?.(commands);
    },
    onError: async () => {
      const queue = commandQueueRef.current!;
      await opts.onError?.([...queue.state.inTransit]);
    },
    onFinish: () => opts.onFinish?.(),
  });

  const commandQueue = useCommandQueue({
    onQueue: () => runManager.schedule(),
  });
  commandQueueRef.current = commandQueue;

  return {
    commandQueue,
    runManager,
    runBatchesRef,
  };
};

describe("assistant transport scheduling contracts", () => {
  it("uses current callbacks when scheduled by a descendant layout effect", async () => {
    const onRunA = vi.fn(async () => {});
    const onRunB = vi.fn(async () => {});
    // act flushes passive effects before real microtasks, so preserve the
    // browser's microtask-before-passive-effect ordering at the layout boundary.
    const queueMicrotaskSpy = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => callback());

    const Scheduler = ({
      schedule,
      enabled,
    }: {
      schedule: () => void;
      enabled: boolean;
    }) => {
      useLayoutEffect(() => {
        if (enabled) schedule();
      }, [enabled, schedule]);
      return null;
    };
    const Probe = ({
      enabled,
      onRun,
    }: {
      enabled: boolean;
      onRun: (signal: AbortSignal) => Promise<void>;
    }) => {
      const runManager = useRunManager({ onRun });
      return createElement(Scheduler, {
        enabled,
        schedule: runManager.schedule,
      });
    };

    try {
      const view = render(
        createElement(Probe, { enabled: false, onRun: onRunA }),
      );
      view.rerender(createElement(Probe, { enabled: true, onRun: onRunB }));
      await act(async () => {});

      expect(onRunB).toHaveBeenCalledTimes(1);
      expect(onRunA).not.toHaveBeenCalled();
    } finally {
      queueMicrotaskSpy.mockRestore();
    }
  });

  it("runs in single-flight mode and schedules exactly one follow-up run", async () => {
    const gate = createDeferred();
    const { result } = renderHook(() =>
      useTransportSchedulingHarness({
        onRun: () => gate.promise,
      }),
    );

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("m1"));
      result.current.commandQueue.enqueue(createMessageCommand("m2"));
    });

    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(1);
    });
    expect(result.current.runBatchesRef.current[0]).toHaveLength(2);

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("m3"));
    });

    await Promise.resolve();
    expect(result.current.runBatchesRef.current).toHaveLength(1);

    gate.resolve();

    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(2);
    });
    expect(result.current.runBatchesRef.current[1]).toHaveLength(1);
  });

  it("can enqueue without scheduling until a run is started", async () => {
    const { result } = renderHook(() => useTransportSchedulingHarness());

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("staged"), {
        schedule: false,
      });
    });

    await Promise.resolve();
    expect(result.current.runBatchesRef.current).toHaveLength(0);

    act(() => {
      result.current.runManager.schedule();
    });

    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(1);
    });
    expect(result.current.runBatchesRef.current[0]).toHaveLength(1);
  });

  it("onError receives the live in-transit commands at error time", async () => {
    const seen: AssistantTransportCommand[][] = [];
    const { result } = renderHook(() =>
      useTransportSchedulingHarness({
        onRun: () => {
          throw new Error("network error");
        },
        onError: (commands) => seen.push(commands),
      }),
    );

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("m1"));
    });

    // The flush that moved m1 into transit has not re-rendered yet when the
    // error fires; the queue state must be read live, not from a render snapshot.
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toEqual([createMessageCommand("m1")]);
  });

  it("settles the run when onFinish throws", async () => {
    const error = new Error("telemetry failed");
    const onFinish = vi.fn<() => void>().mockImplementationOnce(() => {
      throw error;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const { result } = renderHook(() =>
        useTransportSchedulingHarness({ onFinish }),
      );

      act(() => {
        result.current.commandQueue.enqueue(createMessageCommand("m1"));
      });

      await waitFor(() => {
        expect(result.current.runManager.isRunning).toBe(false);
      });

      act(() => {
        result.current.commandQueue.enqueue(createMessageCommand("m2"));
      });

      await waitFor(() => {
        expect(result.current.runBatchesRef.current).toHaveLength(2);
      });
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Assistant transport onFinish callback threw an error",
        error,
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("contains rejected onError callbacks", async () => {
    const callbackError = new Error("error telemetry failed");
    const onError = vi.fn().mockRejectedValue(callbackError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation((message) => {
        if (
          message ===
          "[assistant-ui] Assistant transport onError callback threw an error"
        ) {
          throw new Error("console unavailable");
        }
      });

    try {
      const unhandledRejections = await captureUnhandledRejections(async () => {
        const { result } = renderHook(() =>
          useTransportSchedulingHarness({
            onRun: () => Promise.reject(new Error("network failed")),
            onError,
          }),
        );

        act(() => {
          result.current.commandQueue.enqueue(createMessageCommand("m1"));
        });

        await waitFor(() => {
          expect(result.current.runManager.isRunning).toBe(false);
        });
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Assistant transport onError callback threw an error",
        callbackError,
      );
      expect(unhandledRejections).toEqual([]);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("contains throwing onCancel callbacks", async () => {
    const callbackError = new Error("cancel telemetry failed");
    const onCancel = vi.fn().mockImplementation(() => {
      throw callbackError;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const unhandledRejections = await captureUnhandledRejections(async () => {
        const { result } = renderHook(() =>
          useTransportSchedulingHarness({
            onRun: (signal) =>
              new Promise<void>((_resolve, reject) => {
                signal.addEventListener(
                  "abort",
                  () => reject(new Error("aborted")),
                  { once: true },
                );
              }),
            onCancel,
          }),
        );

        act(() => {
          result.current.commandQueue.enqueue(createMessageCommand("m1"));
        });
        await waitFor(() => {
          expect(result.current.runBatchesRef.current).toHaveLength(1);
        });

        act(() => result.current.runManager.cancel());
        await waitFor(() => {
          expect(result.current.runManager.isRunning).toBe(false);
        });
      });

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Assistant transport onCancel callback threw an error",
        callbackError,
      );
      expect(unhandledRejections).toEqual([]);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("cancel returns combined in-flight and queued commands", async () => {
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useTransportSchedulingHarness({
        onRun: (signal) =>
          new Promise<void>((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            );
          }),
        onCancel,
      }),
    );

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("in-flight"));
    });

    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(1);
    });

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("queued"));
      result.current.runManager.cancel();
    });

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
    expect(onCancel.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("unmount aborts the in-flight run without invoking callbacks", async () => {
    let aborted = false;
    const onCancel = vi.fn();
    const onError = vi.fn();
    const onFinish = vi.fn();
    const { result, unmount } = renderHook(() =>
      useTransportSchedulingHarness({
        onRun: (signal) =>
          new Promise<void>((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () => {
                aborted = true;
                reject(new Error("aborted"));
              },
              { once: true },
            );
          }),
        onCancel,
        onError,
        onFinish,
      }),
    );

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("in-flight"));
    });
    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(1);
    });

    unmount();

    expect(aborted).toBe(true);
    await act(async () => {});
    expect(onCancel).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("ignores schedules after unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useTransportSchedulingHarness(),
    );

    unmount();
    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("late"));
    });

    await act(async () => {});
    expect(result.current.runBatchesRef.current).toHaveLength(0);
  });

  it("survives StrictMode double-mounting", async () => {
    const gate = createDeferred();
    const onFinish = vi.fn();
    const { result } = renderHook(
      () =>
        useTransportSchedulingHarness({ onRun: () => gate.promise, onFinish }),
      { wrapper: ({ children }) => createElement(StrictMode, null, children) },
    );

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("m1"));
    });
    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(1);
    });

    // enqueued while the first run is in flight — must restart as a follow-up
    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("m2"));
    });

    gate.resolve();
    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(2);
    });
    expect(result.current.runBatchesRef.current[1]).toHaveLength(1);
    expect(onFinish).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.runManager.isRunning).toBe(false);
    });
  });
});
