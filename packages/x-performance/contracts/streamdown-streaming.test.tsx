import { describe, expect, it, vi } from "vitest";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";
import { createRenderCounter } from "../src/render-counter";

const renderObserver = vi.hoisted(() => ({ current: () => {} }));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    useMessagePartText: () => {
      renderObserver.current();
      return original.useMessagePartText();
    },
  };
});

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const counter = createRenderCounter();
renderObserver.current = () => counter.useRender("primitive");

const convertMessage = (message: Msg): ThreadMessageLike => ({
  id: message.id,
  role: message.role,
  content: [{ type: "text", text: message.text }],
});

const makeComponents = (defer: boolean) => {
  const Text = () => <StreamdownTextPrimitive defer={defer} smooth={false} />;
  const Message = () => <MessagePrimitive.Parts components={{ Text }} />;
  return { Message };
};

const mount = (defer: boolean) => {
  const components = makeComponents(defer);
  let setMessages!: (updater: (previous: Msg[]) => Msg[]) => void;
  const App = () => {
    const [messages, set] = useState<Msg[]>([
      { id: "u1", role: "user", text: "hello" },
      { id: "a1", role: "assistant", text: "0" },
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
        <ThreadPrimitive.Messages components={components} />
      </AssistantRuntimeProvider>
    );
  };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(App)));
  return {
    append: (token: number) =>
      act(() =>
        setMessages((previous) =>
          previous.map((message) =>
            message.id === "a1"
              ? { ...message, text: `${message.text} ${token}` }
              : message,
          ),
        ),
      ),
    unmount: () => act(() => root.unmount()),
  };
};

describe.each([
  { name: "defer off", defer: false },
  { name: "defer on", defer: true },
])("Streamdown streaming with $name", ({ defer }) => {
  // The external-store push renders the changed text primitive once per token.
  // `defer` does not change this count because DeferredStreamdownBody owns the
  // deferred pass below the primitive boundary. Moving useDeferredValue back
  // into StreamdownTextPrimitive adds one primitive render per token.
  it("renders the primitive once per token", () => {
    counter.reset();
    const app = mount(defer);
    const mountRenders = counter.renders("primitive");
    const TOKENS = 5;

    try {
      for (let token = 1; token <= TOKENS; token++) app.append(token);

      expect(counter.renders("primitive") - mountRenders).toBe(TOKENS);
    } finally {
      app.unmount();
    }
  });
});
