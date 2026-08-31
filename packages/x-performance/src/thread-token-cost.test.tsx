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

  const runToolSiblingScenario = (
    makeToolPart: () => Extract<
      Exclude<ThreadMessageLike["content"][number], string>,
      { type: "tool-call" }
    >,
  ) => {
    counter.reset();
    let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;

    const ToolFallback = () => {
      counter.useRender("tool-part");
      return <span>tool</span>;
    };
    const MixedMessage = () => (
      <MessagePrimitiveParts
        components={{ Text, tools: { Fallback: ToolFallback } }}
      />
    );
    const MIXED = { Message: MixedMessage };

    const convertMixed = (m: Msg): ThreadMessageLike =>
      m.role === "assistant"
        ? {
            id: m.id,
            role: m.role,
            content: [makeToolPart(), { type: "text", text: m.text }],
          }
        : convertMessage(m);

    const App = () => {
      const [messages, set] = useState<Msg[]>([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "so far" },
      ]);
      setMessages = set;
      const runtime = useExternalStoreRuntime<Msg>({
        messages,
        convertMessage: convertMixed,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages components={MIXED} />
        </AssistantRuntimeProvider>
      );
    };

    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(createElement(App)));
    const mounted = counter.snapshot();

    for (let i = 0; i < 10; i++) {
      flushSync(() =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "a1" ? { ...m, text: `${m.text}tok ` } : m,
          ),
        ),
      );
    }

    const deltas = {
      textDelta: counter.renders("text") - (mounted["renders:text"] ?? 0),
      toolDelta:
        counter.renders("tool-part") - (mounted["renders:tool-part"] ?? 0),
    };
    flushSync(() => root.unmount());
    return deltas;
  };

  const TOOL_PART = {
    type: "tool-call" as const,
    toolCallId: "call_1",
    toolName: "search",
    args: { q: "x" },
    result: { ok: true },
  };

  it("a stable tool part object does not re-render on sibling text tokens", () => {
    const run = runToolSiblingScenario(() => TOOL_PART);
    expect(run.textDelta).toBe(10);
    expect(run.toolDelta).toBe(0);
  });

  it("a recreated part object with stable nested fields stays memoized", () => {
    // The store's part state derivation compares part fields shallowly, so
    // rebuilding the outer part object per token is free as long as nested
    // field values (args, result) keep their identity.
    const run = runToolSiblingScenario(() => ({ ...TOOL_PART }));
    expect(run.textDelta).toBe(10);
    expect(run.toolDelta).toBe(0);
  });

  it("a converter that recreates nested part fields pays one tool render per token", () => {
    // Fresh args and result objects fail the part state derivation's shallow
    // field comparison, so every sibling part re-renders on each token;
    // nested field identity stability in converters is load-bearing.
    const run = runToolSiblingScenario(() => ({
      ...TOOL_PART,
      args: { q: "x" },
      result: { ok: true },
    }));
    expect(run.textDelta).toBe(10);
    expect(run.toolDelta).toBe(10);
  });
});
