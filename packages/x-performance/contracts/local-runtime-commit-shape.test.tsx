import { describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { AssistantRuntime, ChatModelAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useLocalRuntime,
} from "@assistant-ui/core/react";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const counter = createRenderCounter();

const Text = ({ text }: { text: string }) => {
  counter.useRender("text");
  return createElement("span", null, text);
};
const Message = () => {
  counter.useRender("message");
  return <MessagePrimitiveParts components={{ Text }} />;
};
const COMPONENTS = { Message };

const until = async (predicate: () => boolean) => {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition not reached within 200 macrotasks");
};

describe("local runtime commit shape", () => {
  it("streams one text render per yielded chunk", async () => {
    counter.reset();
    const gates: (() => void)[] = [];
    const gate = () =>
      new Promise<void>((resolve) => {
        gates.push(resolve);
      });

    const TOKENS = 5;
    const adapter: ChatModelAdapter = {
      async *run() {
        let text = "";
        for (let i = 0; i < TOKENS; i++) {
          await gate();
          text += "tok ";
          yield { content: [{ type: "text" as const, text }] };
        }
      },
    };

    let runtime!: AssistantRuntime;
    const App = () => {
      runtime = useLocalRuntime(adapter);
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {counter.wrapCommits(
            "thread",
            <ThreadPrimitiveMessages components={COMPONENTS} />,
          )}
        </AssistantRuntimeProvider>
      );
    };

    const root = createRoot(document.createElement("div"));
    act(() => root.render(createElement(App)));

    await act(async () => {
      runtime.thread.append("hello");
      await until(() => gates.length === 1);
    });
    const beforeTokens = counter.snapshot();

    for (let i = 0; i < TOKENS; i++) {
      const textBefore = counter.renders("text");
      await act(async () => {
        gates[i]!();
        await until(() =>
          i === TOKENS - 1
            ? !runtime.thread.getState().isRunning
            : gates.length === i + 2,
        );
      });
      expect(counter.renders("text")).toBe(textBefore + 1);
    }

    const delta = Object.fromEntries(
      Object.entries(counter.snapshot()).map(([k, v]) => [
        k,
        v - (beforeTokens[k] ?? 0),
      ]),
    );

    // Mid-stream, each yielded chunk costs one commit and one text render with
    // the message wrapper untouched.
    expect(delta).toEqual({
      "commits:thread": TOKENS,
      "renders:text": TOKENS,
      "renders:message": 0,
    });

    // The boundaries add the rest: the append renders the message and its
    // synthetic empty running part, the first chunk swaps that part for the
    // real one, and run completion settles with the final token. The append
    // settles before the mid-stream baseline above; the whole-run totals
    // include the mount and append commits.
    expect(counter.snapshot()).toEqual({
      "commits:thread": TOKENS + 2,
      "renders:text": TOKENS + 2,
      "renders:message": 2,
    });

    act(() => root.unmount());
  });
});
