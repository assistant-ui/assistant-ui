// @vitest-environment jsdom

import { render, act } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect } from "vitest";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../context";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter } from "../legacy-runtime/runtime-cores/local/ChatModelAdapter";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// An adapter whose run() blocks until released (or aborted), so the thread
// stays in `isRunning: true` while we exercise the queue.
const createBlockingAdapter = () => {
  let release: () => void = () => {};
  const adapter: ChatModelAdapter = {
    async *run({ abortSignal }) {
      await new Promise<void>((resolve) => {
        release = resolve;
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
      yield { content: [{ type: "text", text: "done" }] };
    },
  };
  return { adapter, release: () => release() };
};

const userTexts = (aui: ReturnType<typeof useAui>) =>
  aui
    .thread()
    .getState()
    .messages.filter((m) => m.role === "user")
    .map((m) =>
      m.content.map((p) => (p.type === "text" ? p.text : "")).join(""),
    );

const renderWithRuntime = (adapter: ChatModelAdapter) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const runtime = useLocalRuntime(adapter);
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  return captured.aui!;
};

const startRun = async (aui: ReturnType<typeof useAui>, text: string) => {
  await act(async () => {
    aui.thread().composer().setText(text);
    aui.thread().composer().send();
    await flush();
  });
};

describe("composer queue (local runtime, end to end)", () => {
  it("buffers a send while running and flushes it when the run ends", async () => {
    const { adapter, release } = createBlockingAdapter();
    const aui = renderWithRuntime(adapter);

    await startRun(aui, "first");
    expect(aui.thread().getState().isRunning).toBe(true);

    // Send again while running -> should queue, not start a second run.
    await act(async () => {
      aui.thread().composer().setText("second");
      aui.thread().composer().send();
      await flush();
    });
    expect(aui.thread().composer().getState().queue).toHaveLength(1);
    expect(aui.thread().composer().getState().queue[0]!.prompt).toBe("second");
    expect(userTexts(aui)).toEqual(["first"]);

    // End the run -> queued "second" flushes and gets appended.
    await act(async () => {
      release();
      await flush();
    });
    expect(aui.thread().composer().getState().queue).toHaveLength(0);
    expect(userTexts(aui)).toContain("second");
  });

  it("queueItem(index).remove() drops a queued message", async () => {
    const { adapter } = createBlockingAdapter();
    const aui = renderWithRuntime(adapter);

    await startRun(aui, "first");

    await act(async () => {
      aui.thread().composer().setText("a");
      aui.thread().composer().send();
      aui.thread().composer().setText("b");
      aui.thread().composer().send();
      await flush();
    });
    expect(aui.thread().composer().getState().queue).toHaveLength(2);

    await act(async () => {
      aui.thread().composer().queueItem({ index: 0 }).remove();
      await flush();
    });
    const queue = aui.thread().composer().getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0]!.prompt).toBe("b");
  });

  it("send({ steer: true }) appends immediately and does not buffer", async () => {
    const { adapter } = createBlockingAdapter();
    const aui = renderWithRuntime(adapter);

    await startRun(aui, "first");
    expect(aui.thread().getState().isRunning).toBe(true);

    await act(async () => {
      aui.thread().composer().setText("urgent");
      aui.thread().composer().send({ steer: true });
      await flush();
    });

    expect(aui.thread().composer().getState().queue).toHaveLength(0);
    expect(userTexts(aui)).toContain("urgent");
  });

  it("does not queue when idle (sends immediately)", async () => {
    const { adapter, release } = createBlockingAdapter();
    const aui = renderWithRuntime(adapter);

    await startRun(aui, "first");
    await act(async () => {
      release();
      await flush();
    });
    expect(aui.thread().getState().isRunning).toBe(false);

    await act(async () => {
      aui.thread().composer().setText("second");
      aui.thread().composer().send();
      await flush();
    });
    expect(aui.thread().composer().getState().queue).toHaveLength(0);
    expect(userTexts(aui)).toEqual(["first", "second"]);
  });
});
