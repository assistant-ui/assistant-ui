import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type SmoothOptions,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const counter = createRenderCounter();

const convertMessage = (m: Msg): ThreadMessageLike => ({
  id: m.id,
  role: m.role,
  content: [{ type: "text", text: m.text }],
});

const FRAME_MS = 16;
const CHUNK = "twenty-five characters!!!";

const mount = (smooth: boolean | SmoothOptions) => {
  let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;
  const Text = () =>
    counter.wrapCommits(
      "text",
      <MessagePartPrimitive.Text smooth={smooth} />,
    ) as never;
  const Message = () => <MessagePrimitive.Parts components={{ Text }} />;
  const COMPONENTS = { Message };
  const App = () => {
    const [messages, set] = useState<Msg[]>([
      { id: "u1", role: "user", text: "hello" },
      { id: "a1", role: "assistant", text: "" },
    ]);
    setMessages = set;
    const runtime = useExternalStoreRuntime<Msg>({
      messages,
      convertMessage,
      isRunning: true,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Messages components={COMPONENTS} />
      </AssistantRuntimeProvider>
    );
  };
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(createElement(App)));
  return {
    text: () => container.textContent,
    append: (chunk: string) =>
      act(() =>
        setMessages((prev) =>
          prev.map((m) => (m.id === "a1" ? { ...m, text: m.text + chunk } : m)),
        ),
      ),
    frame: () => act(() => vi.advanceTimersByTime(FRAME_MS)),
    unmount: () => act(() => root.unmount()),
  };
};

const drain = (smooth: boolean | SmoothOptions) => {
  counter.reset();
  const app = mount(smooth);
  const commitsBefore = counter.commits("text");
  app.append(CHUNK);
  let frames = 0;
  while (app.text() !== `hello${CHUNK}` && frames < 100) {
    app.frame();
    frames += 1;
  }
  const result = {
    frames,
    commits: counter.commits("text") - commitsBefore,
    text: app.text(),
  };
  app.unmount();
  return result;
};

describe("smooth streaming frame commits", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["Date", "requestAnimationFrame", "cancelAnimationFrame"],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // The animator reveals min(5ms, drainMs / remaining) worth of characters per
  // frame and commits on every frame that revealed something, so a 25-character
  // chunk that arrives at once is paid for over 8 frames of 16ms, one commit
  // each, on top of the commit that delivered the chunk.
  it("commits once per animation frame while draining a chunk", () => {
    const result = drain(true);
    expect(result.text).toBe(`hello${CHUNK}`);
    expect(result.frames).toBe(8);
    expect(result.commits).toBe(1 + 8);
  });

  it("minCommitMs batches frames into fewer commits without changing the drain", () => {
    const result = drain({ minCommitMs: 50 });
    expect(result.text).toBe(`hello${CHUNK}`);
    expect(result.frames).toBe(8);
    expect(result.commits).toBe(1 + 3);
  });

  it("commits exactly once per chunk with smoothing off", () => {
    const result = drain(false);
    expect(result.text).toBe(`hello${CHUNK}`);
    expect(result.frames).toBe(0);
    expect(result.commits).toBe(1);
  });
});
