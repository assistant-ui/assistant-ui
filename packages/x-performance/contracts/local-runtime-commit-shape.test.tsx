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
        // Keep run completion outside the token measurement.
        await gate();
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
        await until(() => gates.length === i + 2);
      });
      expect(counter.renders("text")).toBe(textBefore + 1);
    }

    const delta = Object.fromEntries(
      Object.entries(counter.snapshot()).map(([k, v]) => [
        k,
        v - (beforeTokens[k] ?? 0),
      ]),
    );

    expect(delta).toEqual({
      "commits:thread": TOKENS,
      "renders:text": TOKENS,
      "renders:message": 0,
    });

    await act(async () => {
      gates[TOKENS]!();
      await until(() => !runtime.thread.getState().isRunning);
    });

    expect(counter.snapshot()).toEqual({
      "commits:thread": TOKENS + 3,
      "renders:text": TOKENS + 3,
      "renders:message": 2,
    });

    act(() => root.unmount());
  });
});
