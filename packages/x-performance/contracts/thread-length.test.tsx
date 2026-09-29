import { describe, expect, it } from "vitest";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const counter = createRenderCounter();
let conversions = 0;

const convertMessage = (m: Msg): ThreadMessageLike => {
  conversions += 1;
  return { id: m.id, role: m.role, content: [{ type: "text", text: m.text }] };
};

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

const seed = (n: number): Msg[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 ? "assistant" : "user",
    text: `message ${i}`,
  }));

const mount = (n: number) => {
  let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;
  const App = () => {
    const [messages, set] = useState<Msg[]>(() => seed(n));
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
  act(() => root.render(createElement(App)));
  const append = (id: string) =>
    act(() =>
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text: `${m.text} tok` } : m)),
      ),
    );
  return { append, unmount: () => act(() => root.unmount()) };
};

const TOKENS = 20;

const streamInto = (n: number) => {
  counter.reset();
  conversions = 0;
  const app = mount(n);
  const mounted = counter.snapshot();
  const converted = conversions;
  for (let i = 0; i < TOKENS; i++) app.append(`m${n - 1}`);
  const after = counter.snapshot();
  app.unmount();
  const delta = (key: string) => (after[key] ?? 0) - (mounted[key] ?? 0);
  return {
    mounted,
    conversions: converted,
    perStream: {
      text: delta("renders:text"),
      assistant: delta("renders:message:assistant"),
      user: delta("renders:message:user"),
      commits: delta("commits:thread"),
      conversions: conversions - converted,
    },
  };
};

describe("thread length", () => {
  it("mounts every message once, converts every message once, and commits once", () => {
    const { mounted, conversions } = streamInto(200);
    expect(mounted).toEqual({
      "renders:message:user": 100,
      "renders:message:assistant": 100,
      "renders:text": 200,
      "commits:thread": 1,
    });
    expect(conversions).toBe(200);
  });

  // The external-store core walks every message on every update (conversion
  // cache lookups, dedupe, repository relink), so wall time per token still
  // grows with thread length; this pins that the React work does not.
  it("streams a token at the same render, commit, and conversion cost in a 2-message and a 200-message thread", () => {
    const short = streamInto(2).perStream;
    const long = streamInto(200).perStream;
    expect(short).toEqual({
      text: TOKENS,
      assistant: 0,
      user: 0,
      commits: 2 * TOKENS,
      conversions: TOKENS,
    });
    expect(long).toEqual(short);
  });
});
