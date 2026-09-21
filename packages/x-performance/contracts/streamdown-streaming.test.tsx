import { describe, expect, it, vi } from "vitest";
import { act, createElement, type ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  TextMessagePartProvider,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  StreamdownTextPrimitive,
  type SyntaxHighlighterProps,
  useStreamdownPreProps,
} from "@assistant-ui/react-streamdown";
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

type TextProps = { text: string; isRunning: boolean };

const HighlightedCode = counter.track(
  "highlighter",
  ({ code }: SyntaxHighlighterProps) => <pre>{code}</pre>,
);

const PrePropsHeader = () => {
  counter.useRender("pre props consumer");
  useStreamdownPreProps();
  return null;
};

const mountText = (Text: (props: TextProps) => ReactNode) => {
  const root = createRoot(document.createElement("div"));
  return {
    show: (text: string, isRunning: boolean) =>
      act(() => root.render(<Text text={text} isRunning={isRunning} />)),
    unmount: () => act(() => root.unmount()),
  };
};

describe("Streamdown settled code blocks", () => {
  const TOKENS = 5;
  const fence = "```ts\nconst x = 1;\n```";
  const tail = (tokens: number) =>
    Array.from({ length: tokens + 1 }, (_, token) => `word${token}`).join(" ");
  const withTail = (tokens: number) => `${fence}\n\n${tail(tokens)}`;

  // Streamdown re-renders a settled block when a `components` entry changes
  // identity, and every block once when an animated message completes. The code
  // adapter and every `useStreamdownPreProps` consumer have to hold across both:
  // each re-render parses a new pre node, and the language map is a fresh literal.
  it.each([
    {
      name: "an inline components entry re-renders the block",
      Text: ({ text, isRunning }: TextProps) => (
        <TextMessagePartProvider text={text} isRunning={isRunning}>
          <StreamdownTextPrimitive
            components={{
              a: ({ node: _, ...props }) => <a {...props} />,
              CodeHeader: PrePropsHeader,
            }}
            componentsByLanguage={{
              ts: { SyntaxHighlighter: HighlightedCode },
            }}
          />
        </TextMessagePartProvider>
      ),
    },
    {
      name: "an animated message completes",
      Text: ({ text, isRunning }: TextProps) => (
        <TextMessagePartProvider text={text} isRunning={isRunning}>
          <StreamdownTextPrimitive
            animated
            components={{ CodeHeader: PrePropsHeader }}
            componentsByLanguage={{
              ts: { SyntaxHighlighter: HighlightedCode },
            }}
          />
        </TextMessagePartProvider>
      ),
    },
  ])("does not re-render the settled code block when $name", ({ Text }) => {
    counter.reset();
    const app = mountText(Text);

    try {
      app.show(withTail(0), true);
      expect(counter.snapshot()).toMatchObject({
        "renders:highlighter": 1,
        "renders:pre props consumer": 1,
      });

      counter.reset();
      for (let token = 1; token <= TOKENS; token++) {
        app.show(withTail(token), true);
      }
      app.show(withTail(TOKENS), false);

      expect(counter.renders("highlighter")).toBe(0);
      expect(counter.renders("pre props consumer")).toBe(0);
    } finally {
      app.unmount();
    }
  });

  // Raw HTML can nest pre inside pre. Each level compares its own node up to
  // the next nested pre, so an outer level, whose code child has element
  // children and re-renders anyway, provides a new pre props value on every
  // re-render, while the innermost level holds its value and its code adapter
  // bails out. React 19 still schedules every PreContext consumer below a
  // changed outer provider, an unchanged nested provider in between does not
  // stop it, so the innermost consumer re-renders once per token with the one
  // value it has always read while the highlighter beside it does not run.
  it("holds the innermost highlighter of nested raw pre markup", () => {
    const DEPTH = 3;
    const nested = (tokens: number) =>
      `${"<pre><code>".repeat(DEPTH - 1)}<pre><code class="language-ts">const x = 1;</code></pre>${"</code></pre>".repeat(DEPTH - 1)}\n\n${tail(tokens)}`;
    const seen = new Set<unknown>();
    const InnermostHeader = () => {
      counter.useRender("pre props consumer");
      seen.add(useStreamdownPreProps());
      return null;
    };
    const Text = ({ text, isRunning }: TextProps) => (
      <TextMessagePartProvider text={text} isRunning={isRunning}>
        <StreamdownTextPrimitive
          mode="static"
          componentsByLanguage={{
            ts: {
              SyntaxHighlighter: HighlightedCode,
              CodeHeader: InnermostHeader,
            },
          }}
        />
      </TextMessagePartProvider>
    );
    counter.reset();
    const app = mountText(Text);

    try {
      app.show(nested(0), false);
      expect(counter.snapshot()).toMatchObject({
        "renders:highlighter": 1,
        "renders:pre props consumer": 1,
      });

      counter.reset();
      for (let token = 1; token <= TOKENS; token++) {
        app.show(nested(token), false);
      }

      expect(counter.renders("highlighter")).toBe(0);
      expect(counter.renders("pre props consumer")).toBe(TOKENS);
      expect(seen.size).toBe(1);
    } finally {
      app.unmount();
    }
  });

  it("re-runs the highlighter once per token while the fence grows", () => {
    const Text = ({ text, isRunning }: TextProps) => (
      <TextMessagePartProvider text={text} isRunning={isRunning}>
        <StreamdownTextPrimitive
          componentsByLanguage={{ ts: { SyntaxHighlighter: HighlightedCode } }}
        />
      </TextMessagePartProvider>
    );
    counter.reset();
    const app = mountText(Text);
    const growing = (tokens: number) =>
      `\`\`\`ts\nconst x = 0${Array.from({ length: tokens }, (_, token) => ` + ${token + 1}`).join("")}`;

    try {
      app.show(growing(0), true);
      expect(counter.renders("highlighter")).toBe(1);

      counter.reset();
      for (let token = 1; token <= TOKENS; token++) {
        app.show(growing(token), true);
      }

      expect(counter.renders("highlighter")).toBe(TOKENS);
    } finally {
      app.unmount();
    }
  });
});
