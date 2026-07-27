// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createElement, StrictMode, useRef } from "react";
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

const useTransportSchedulingHarness = (
  opts: {
    onRun?: (signal: AbortSignal) => Promise<void> | void;
    onCancel?: (commands: AssistantTransportCommand[]) => void;
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
      // not needed for these contract tests
    },
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
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("survives StrictMode double-mounting", async () => {
    const gate = createDeferred();
    const { result } = renderHook(
      () => useTransportSchedulingHarness({ onRun: () => gate.promise }),
      { wrapper: ({ children }) => createElement(StrictMode, null, children) },
    );

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("m1"));
    });
    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(1);
    });

    gate.resolve();
    await waitFor(() => {
      expect(result.current.runManager.isRunning).toBe(false);
    });

    act(() => {
      result.current.commandQueue.enqueue(createMessageCommand("m2"));
    });
    await waitFor(() => {
      expect(result.current.runBatchesRef.current).toHaveLength(2);
    });
  });
});
