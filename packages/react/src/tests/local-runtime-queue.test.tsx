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
  aui
    .thread()
    .getState()
    .messages.filter((m) => m.role === "user")
    .map((m) =>
      m.content.map((p) => (p.type === "text" ? p.text : "")).join(""),
    );

const renderWithRuntime = (adapter: ChatModelAdapter, enableQueue: boolean) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const runtime = useLocalRuntime(adapter, {
      unstable_enableMessageQueue: enableQueue,
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
    aui.thread().composer().setText(text);
    aui.thread().composer().send();
    await flush();
  });
};

describe("local runtime message queue", () => {
  it("buffers a send while running and flushes it when the run ends", async () => {
    const { adapter, releases } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    expect(aui.thread().getState().isRunning).toBe(true);
    expect(aui.thread().getState().capabilities.queue).toBe(true);

    await send(aui, "second");
    expect(
      aui
        .thread()
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
    expect(aui.thread().composer().getState().queue).toEqual([]);
    expect(userTexts(aui)).toContain("second");
  });

  it("drains two queued items in separate runs, not all at once", async () => {
    const { adapter, releases, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    expect(getRunCount()).toBe(1);

    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread().composer().getState().queue).toHaveLength(2);

    await act(async () => {
      releases[0]!();
      await flush();
      await flush();
    });
    expect(getRunCount()).toBe(2);
    expect(
      aui
        .thread()
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["b"]);
  });

  it("queueItem(index).remove() drops a queued message", async () => {
    const { adapter } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread().composer().getState().queue).toHaveLength(2);

    await act(async () => {
      aui.thread().composer().queueItem({ index: 0 }).remove();
      await flush();
    });
    const queue = aui.thread().composer().getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0]!.prompt).toBe("b");
  });

  it("clears the queue when the run is cancelled, without flushing", async () => {
    const { adapter, getRunCount } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await send(aui, "a");
    await send(aui, "b");
    expect(aui.thread().composer().getState().queue).toHaveLength(2);

    await act(async () => {
      aui.thread().cancelRun();
      await flush();
      await flush();
    });

    expect(aui.thread().composer().getState().queue).toEqual([]);
    // cancelling must not start the next queued message
    expect(getRunCount()).toBe(1);
  });

  it("applies an edit instead of queuing it, dropping pending items", async () => {
    const { adapter, releases } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, true);

    await send(aui, "first");
    await act(async () => {
      releases[0]!();
      await flush();
    });

    // start a second run and queue a message behind it
    await send(aui, "second");
    await send(aui, "queued");
    expect(aui.thread().composer().getState().queue).toHaveLength(1);

    // edit the first message while the run is in progress
    await act(async () => {
      const message = aui.thread().message({ index: 0 });
      message.composer().beginEdit();
      message.composer().setText("edited");
      message.composer().send();
      await flush();
    });

    // the edit is applied (branches the thread) and the stale queue is cleared
    expect(aui.thread().composer().getState().queue).toEqual([]);
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
      aui.thread().message({ index: 1 }).reload();
      await flush();
    });
    expect(getRunCount()).toBe(2);
    expect(aui.thread().getState().isRunning).toBe(true);

    // sending now must buffer, not interrupt the regenerate
    await act(async () => {
      aui.thread().composer().setText("Y");
      aui.thread().composer().send();
      await flush();
    });
    expect(getRunCount()).toBe(2);
    expect(
      aui
        .thread()
        .composer()
        .getState()
        .queue.map((q) => q.prompt),
    ).toEqual(["Y"]);
  });

  it("does not expose the queue capability when the flag is off", async () => {
    const { adapter } = createCountingAdapter();
    const aui = renderWithRuntime(adapter, false);
    expect(aui.thread().getState().capabilities.queue).toBe(false);
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
