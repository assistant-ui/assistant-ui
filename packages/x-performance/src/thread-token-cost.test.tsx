import { describe, expect, it } from "vitest";
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { createRenderCounter } from "./render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const convertMessage = (m: Msg): ThreadMessageLike => ({
  id: m.id,
  role: m.role,
  content: [{ type: "text", text: m.text }],
});

const counter = createRenderCounter();

const Text = ({ text }: { text: string }) => {
  counter.useRender("text");
  return createElement("span", null, text);
};

const Message = () => {
  const role = useAuiState((s) => s.message.role);
  counter.useRender(`message:${role}`);
  return createElement(MessagePrimitiveParts, { components: { Text } });
};

const COMPONENTS = { Message };

describe("thread token cost", () => {
  it("appending a token re-renders only the streaming message's text part", () => {
    counter.reset();
    let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;

    const App = () => {
      const [messages, set] = useState<Msg[]>([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "" },
      ]);
      setMessages = set;
      const runtime = useExternalStoreRuntime<Msg>({
        messages,
        convertMessage,
        onNew: async () => {},
      });
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
    flushSync(() => root.render(createElement(App)));

    const mounted = counter.snapshot();

    const TOKENS = 20;
    for (let i = 0; i < TOKENS; i++) {
      flushSync(() =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "a1" ? { ...m, text: `${m.text}tok ` } : m,
          ),
        ),
      );
    }

    const after = counter.snapshot();
    const delta = Object.fromEntries(
      Object.entries(after).map(([k, v]) => [k, v - (mounted[k] ?? 0)]),
    );

    expect(delta["renders:text"]).toBe(TOKENS);
    expect(delta["renders:message:assistant"] ?? 0).toBe(0);
    expect(delta["renders:message:user"] ?? 0).toBe(0);
    // Two commits per append: the host setState commit, then the passive-effect
    // adapter push whose store notification React flushes inside the same
    // discrete flushSync. A React scheduling change moves this number alone.
    expect(delta["commits:thread"]).toBe(2 * TOKENS);

    expect(mounted).toEqual({
      "renders:text": 1,
      "renders:message:assistant": 1,
      "renders:message:user": 1,
      "commits:thread": 1,
    });

    flushSync(() => root.unmount());
  });
});
