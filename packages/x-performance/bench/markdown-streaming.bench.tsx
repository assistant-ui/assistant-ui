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
const makeText = (defer: boolean) => () =>
  createElement(MarkdownTextPrimitive, { smooth: false, defer, components });
const makeComponents = (defer: boolean) => {
  const Text = makeText(defer);
  const Message = () =>
    createElement(MessagePrimitive.Parts, { components: { Text } });
  return { Message };
};

const paragraphs = (n: number) =>
  Array.from(
    { length: n },
    (_, i) =>
      `Paragraph ${i} of the streamed answer keeps **emphasis**, a [link](https://example.com), and \`inline code\` in every line so the parse stays realistic.`,
  ).join("\n\n");

type Host = { tick: () => void | Promise<void>; unmount: () => void };

const mount = (n: number, defer = false): Host => {
  let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;
  const body = paragraphs(n);
  let flip = false;
  const threadComponents = makeComponents(defer);
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
        <ThreadPrimitive.Messages components={threadComponents} />
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
      // `flushSync` flushes discrete work only, so the deferred pass a token
      // schedules lands after the callback returns and outside the sample. The
      // deferred rows settle it explicitly; the rows above deliberately do not,
      // so their history stays comparable.
      return defer ? settleTransitions() : undefined;
    },
    unmount: () => flushSync(() => root.unmount()),
  };
};

// React schedules a transition on a macrotask, so yielding the queue once runs
// the deferred pass. A bench callback may be async, which is what lets that pass
// fall inside the measured window.
const settleTransitions = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

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

// `defer` is what the kit ships, and the row above cannot see it: the pass it
// schedules runs at transition priority, after the sample closes. These rows
// settle that pass inside the sample so the deferred path has a wall-time number
// at all. Read them against each other, never against the rows above: every
// sample here carries one macrotask yield, a constant these numbers include and
// the flushSync series does not.
describe("react-markdown: the same token with defer on", () => {
  for (const n of SIZES) {
    let host: Host;
    bench(`${n} paragraphs deferred`, async () => await host.tick(), {
      setup: () => {
        host = mount(n, true);
      },
      teardown: () => host.unmount(),
    });
  }
});
