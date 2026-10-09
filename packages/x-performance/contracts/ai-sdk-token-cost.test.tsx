import { describe, expect, it, vi } from "vitest";
import { act, createElement, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAuiState } from "@assistant-ui/store";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
} from "@assistant-ui/core/react";
import { useAISDKRuntime } from "@assistant-ui/ai-sdk";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type UIMessage = {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
};

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

const helpers = {
  id: "chat-1",
  status: "streaming",
  error: undefined,
  setMessages: vi.fn(),
  sendMessage: vi.fn(),
  regenerate: vi.fn(),
  addToolOutput: vi.fn(),
  addToolApprovalResponse: vi.fn(),
  stop: vi.fn(),
};

const initial: UIMessage[] = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "hello" }] },
  { id: "a1", role: "assistant", parts: [{ type: "text", text: "" }] },
];

const appendToken = (messages: UIMessage[]) =>
  messages.map((m) =>
    m.id === "a1"
      ? {
          ...m,
          parts: m.parts.map((part) =>
            part.type === "text" ? { ...part, text: `${part.text}tok ` } : part,
          ),
        }
      : m,
  );

describe("ai-sdk token cost", () => {
  // useChat re-mints its helpers object on every render, so each token
  // reaches useAISDKRuntime as a new chat object with a new messages array;
  // the converter cache keeps the unchanged messages and only the streaming
  // message is re-converted, which the external-store core then applies
  // with the same two-commit shape as any external store.
  it("appending a token re-renders only the streaming message's text part", () => {
    counter.reset();
    let setMessages!: (updater: (prev: UIMessage[]) => UIMessage[]) => void;

    const App = () => {
      const [messages, set] = useState<UIMessage[]>(initial);
      setMessages = set;
      const chat = useMemo(() => ({ ...helpers, messages }), [messages]);
      const runtime = useAISDKRuntime(chat as never);
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
    const mounted = counter.snapshot();

    const TOKENS = 20;
    for (let i = 0; i < TOKENS; i++) {
      act(() => setMessages(appendToken));
    }
    const after = counter.snapshot();
    const delta = (key: string) => (after[key] ?? 0) - (mounted[key] ?? 0);

    expect(delta("renders:text")).toBe(TOKENS);
    expect(delta("renders:message:user")).toBe(0);
    expect(delta("renders:message:assistant")).toBe(0);
    expect(delta("commits:thread")).toBe(2 * TOKENS);

    act(() => root.unmount());
  });
});
