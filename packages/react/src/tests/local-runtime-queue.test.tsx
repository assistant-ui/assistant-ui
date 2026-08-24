// @vitest-environment jsdom

import { render, act } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect } from "vitest";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../context";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter } from "../legacy-runtime/runtime-cores/local/ChatModelAdapter";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const createCountingAdapter = () => {
  const releases: Array<() => void> = [];
  let runCount = 0;
  const adapter: ChatModelAdapter = {
    async *run({ abortSignal }) {
      runCount++;
      await new Promise<void>((resolve) => {
        releases.push(resolve);
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
      yield { content: [{ type: "text", text: "done" }] };
    },
  };
  return { adapter, releases, getRunCount: () => runCount };
};

const userTexts = (aui: ReturnType<typeof useAui>) =>
  aui.thread
    .getState()
    .messages.filter((m) => m.role === "user")
    .map((m) =>
      m.content.map((p) => (p.type === "text" ? p.text : "")).join(""),
    );

const renderWithRuntime = (
  adapter: ChatModelAdapter,
  enableQueue: boolean,
  options?: {
    unstable_queueClearOnRewind?: boolean;
    unstable_queueClearOnCancel?: boolean;
  },
) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const runtime = useLocalRuntime(adapter, {
      unstable_enableMessageQueue: enableQueue,
      ...options,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  return captured.aui!;
};

const send = async (aui: ReturnType<typeof useAui>, text: string) => {
  await act(async () => {
    aui.thread.composer().setText(text);
    aui.thread.composer().send();
    await flush();
  });
};

describe("local runtime message queue", () => {
  it("buffers a send while running and flushes it when the run ends", async () => {
    const { adapter, releases } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    expect(aui.thread.getState().isRunning).toBe(true);
    expect(aui.thread.getState().capabilities.queue).toBe(true);

    await send(aui, "second");
    expect(
      aui.thread
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["second"]);
    expect(userTexts(aui)).toEqual(["first"]);

    await act(async () => {
      releases[0]!();
      await flush();
      await flush();
    });
    expect(aui.thread.composer().getState().queue).toEqual([]);
    expect(userTexts(aui)).toContain("second");
  });

  it("drains two queued items in separate runs, not all at once", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    expect(getRunCount()).toBe(1);

    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread.composer().getState().queue).toHaveLength(2);

    await act(async () => {
      releases[0]!();
      await flush();
      await flush();
    });
    expect(getRunCount()).toBe(2);
    expect(
      aui.thread
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["b"]);
  });

  it("defaults a mid-run send to steer, ahead of an explicitly queued item", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    expect(getRunCount()).toBe(1);

    await act(async () => {
      aui.thread.composer().setText("behind");
      aui.thread.composer().send({ steer: false });
      await flush();
    });
    await send(aui, "next");
    expect(
      aui.thread
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["next", "behind"]);

    await act(async () => {
      releases[0]!();
      await flush();
      await flush();
    });
    expect(getRunCount()).toBe(2);
    expect(userTexts(aui)).toEqual(["first", "next"]);

    await act(async () => {
      releases[1]!();
      await flush();
      await flush();
    });
    expect(getRunCount()).toBe(3);
    expect(userTexts(aui)).toEqual(["first", "next", "behind"]);
  });

  it("queueItem(index).remove() drops a queued message", async () => {
    const { adapter } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread.composer().getState().queue).toHaveLength(2);

    await act(async () => {
      aui.thread.composer().queueItem({ index: 0 }).remove();
      await flush();
    });
    const queue = aui.thread.composer().getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0]!.prompt).toBe("b");
  });

  it("clears queued items when the user cancels the run", async () => {
    const { adapter, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread.composer().getState().queue).toHaveLength(2);

    await act(async () => {
      aui.thread.cancelRun();
      await flush();
      await flush();
    });

    // Stop means stop: nothing pending, nothing dispatched
    expect(getRunCount()).toBe(1);
    expect(aui.thread.composer().getState().queue).toEqual([]);
  });

  it("keeps queued items on cancel when unstable_queueClearOnCancel is false", async () => {
    const { adapter, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true, {
      unstable_queueClearOnCancel: false,
    });

    await send(aui, "first");
    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread.composer().getState().queue).toHaveLength(2);

    await act(async () => {
      aui.thread.cancelRun();
      await flush();
      await flush();
    });

    // cancel pauses the queue: items survive, nothing auto-dispatches
    expect(getRunCount()).toBe(1);
    expect(
      aui.thread
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["a", "b"]);

    // the next explicit send drains the head
    await send(aui, "c");
    expect(getRunCount()).toBe(2);
    expect(
      aui.thread
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["b", "c"]);
  });

  it("applies an edit instead of queuing it and clears the pending items", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await act(async () => {
      releases[0]!();
      await flush();
    });

    // start a second run and queue a message behind it
    await send(aui, "second");
    await send(aui, "queued");
    expect(aui.thread.composer().getState().queue).toHaveLength(1);

    // edit the first message while the run is in progress
    await act(async () => {
      const message = aui.thread.message({ index: 0 });
      message.composer().beginEdit();
      message.composer().setText("edited");
      message.composer().send();
      await flush();
      await flush();
    });

    // the edit is applied (branches the thread); the rewind clears the queue,
    // so nothing pending dispatches against the new branch
    expect(aui.thread.composer().getState().queue).toEqual([]);
    expect(getRunCount()).toBe(3); // first, second, edit — not "queued"
  });

  it("keeps the queue across an edit when unstable_queueClearOnRewind is false", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true, {
      unstable_queueClearOnRewind: false,
    });

    await send(aui, "first");
    await act(async () => {
      releases[0]!();
      await flush();
    });

    await send(aui, "second");
    await send(aui, "queued");
    expect(aui.thread.composer().getState().queue).toHaveLength(1);

    await act(async () => {
      const message = aui.thread.message({ index: 0 });
      message.composer().beginEdit();
      message.composer().setText("edited");
      message.composer().send();
      await flush();
    });

    // the edit's rerun survives; the queued item waits for it to settle
    expect(getRunCount()).toBe(3);
    expect(aui.thread.composer().getState().queue).toHaveLength(1);

    await act(async () => {
      releases[2]!();
      await flush();
    });

    // the surviving queue drains after the edit's run completes
    expect(getRunCount()).toBe(4);
    expect(aui.thread.composer().getState().queue).toEqual([]);
    expect(userTexts(aui)).toEqual(["edited", "queued"]);
  });

  it("buffers a send during a regenerate instead of interrupting it", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await act(async () => {
      releases[0]!();
      await flush();
    });
    expect(getRunCount()).toBe(1);

    // regenerate the assistant message: a run started outside the queue
    await act(async () => {
      aui.thread.message({ index: 1 }).reload();
      await flush();
    });
    expect(getRunCount()).toBe(2);
    expect(aui.thread.getState().isRunning).toBe(true);

    // sending now must buffer, not interrupt the regenerate
    await act(async () => {
      aui.thread.composer().setText("Y");
      aui.thread.composer().send();
      await flush();
    });
    expect(getRunCount()).toBe(2);
    expect(
      aui.thread
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["Y"]);
  });

  it("drains the pending head after a regenerate started inside the cancellation window", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true, {
      unstable_queueClearOnCancel: false,
    });

    await send(aui, "first");
    await act(async () => {
      releases[0]!();
      await flush();
    });

    // regenerate, buffer a send, then cancel and regenerate again before
    // the cancelled settle lands
    await act(async () => {
      aui.thread.message({ index: 1 }).reload();
      await flush();
    });
    await send(aui, "pending");
    await act(async () => {
      aui.thread.cancelRun();
      aui.thread.message({ index: 1 }).reload();
      await flush();
    });
    expect(getRunCount()).toBe(3);
    expect(aui.thread.composer().getState().queue).toHaveLength(1);

    // the cancelled settle must not eat the replacement's: once the
    // replacement settles, the pending head drains exactly once
    await act(async () => {
      releases[2]!();
      await flush();
    });
    expect(getRunCount()).toBe(4);
    expect(aui.thread.composer().getState().queue).toEqual([]);
  });

  it("keeps a second regenerate alive when the first one's settle arrives", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await act(async () => {
      releases[0]!();
      await flush();
    });

    await act(async () => {
      aui.thread.message({ index: 1 }).reload();
      await flush();
    });
    await send(aui, "Y");

    // the second regenerate aborts the first; its settle must not dispatch
    await act(async () => {
      aui.thread.message({ index: 1 }).reload();
      await flush();
    });
    expect(getRunCount()).toBe(3);
    expect(aui.thread.composer().getState().queue).toHaveLength(1);

    await act(async () => {
      releases[2]!();
      await flush();
    });
    expect(getRunCount()).toBe(4);
    expect(aui.thread.composer().getState().queue).toEqual([]);
  });

  it("advances exactly once after a failed run, without deadlocking", async () => {
    const releases: Array<() => void> = [];
    let runCount = 0;
    const adapter: ChatModelAdapter = {
      async *run({ abortSignal }) {
        runCount++;
        if (runCount === 2) throw new Error("model boom");
        await new Promise<void>((resolve) => {
          releases.push(resolve);
          abortSignal.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
        yield { content: [{ type: "text", text: "done" }] };
      },
    };
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread.composer().getState().queue).toHaveLength(2);

    // run 1 settles -> "a" drains (run 2 throws) -> "b" drains (run 3)
    await act(async () => {
      releases[0]!();
      await flush();
      await flush();
    });
    expect(runCount).toBe(3);
    expect(aui.thread.composer().getState().queue).toEqual([]);

    // "b" is running; a new send must buffer behind it, not interrupt it
    await act(async () => {
      aui.thread.composer().setText("c");
      aui.thread.composer().send();
      await flush();
    });
    expect(runCount).toBe(3);
    expect(
      aui.thread
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["c"]);
  });

  it("does not expose the queue capability when the flag is off", async () => {
    const { adapter } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, false);
    expect(aui.thread.getState().capabilities.queue).toBe(false);
  });

  it("tears the queue down when the flag is toggled off at runtime", async () => {
    const { adapter } = createCountingAdapter();
    const captured: { aui?: ReturnType<typeof useAui> } = {};
    const Capture: FC = () => {
      captured.aui = useAui();
      return null;
    };
    const App: FC<{ enabled: boolean }> = ({ enabled }) => {
      const runtime = useLocalRuntime(adapter, {
        unstable_enableMessageQueue: enabled,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };

    const { rerender } = render(<App enabled={true} />);
    await act(async () => {
      await flush();
    });
    expect(captured.aui!.thread().getState().capabilities.queue).toBe(true);

    await act(async () => {
      rerender(<App enabled={false} />);
      await flush();
    });
    expect(captured.aui!.thread().getState().capabilities.queue).toBe(false);
  });
});
