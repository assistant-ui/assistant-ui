import { bench, describe } from "vitest";
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const convertMessage = (m: Msg): ThreadMessageLike => ({
  id: m.id,
  role: m.role,
  content: [{ type: "text", text: m.text }],
});

const components = memoizeMarkdownComponents({});
const Text = () =>
  createElement(MarkdownTextPrimitive, { smooth: false, components });
const Message = () =>
  createElement(MessagePrimitive.Parts, { components: { Text } });
const COMPONENTS = { Message };

const paragraphs = (n: number) =>
  Array.from(
    { length: n },
    (_, i) =>
      `Paragraph ${i} of the streamed answer keeps **emphasis**, a [link](https://example.com), and \`inline code\` in every line so the parse stays realistic.`,
  ).join("\n\n");

type Host = { tick: () => void; unmount: () => void };

const mount = (n: number): Host => {
  let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;
  const body = paragraphs(n);
  let flip = false;
  const App = () => {
    const [messages, set] = useState<Msg[]>([
      { id: "u1", role: "user", text: "hello" },
      { id: "a1", role: "assistant", text: body },
    ]);
    setMessages = set;
    const runtime = useExternalStoreRuntime<Msg>({
      messages,
      convertMessage,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Messages components={COMPONENTS} />
      </AssistantRuntimeProvider>
    );
  };
  const root = createRoot(document.createElement("div"));
  flushSync(() => root.render(createElement(App)));
  return {
    tick: () => {
      flip = !flip;
      const tail = flip ? " tok a" : " tok b";
      flushSync(() =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "a1" ? { ...m, text: `${body}${tail}` } : m,
          ),
        ),
      );
    },
    unmount: () => flushSync(() => root.unmount()),
  };
};

const SIZES = [1, 10, 50];

// The last paragraph flips between two same-length endings, so every sample
// re-parses a document of fixed length instead of an ever-growing one.
describe("react-markdown: one token changed in the last paragraph, by message length", () => {
  for (const n of SIZES) {
    let host: Host;
    bench(`${n} paragraphs`, () => host.tick(), {
      setup: () => {
        host = mount(n);
      },
      teardown: () => host.unmount(),
    });
  }
});
