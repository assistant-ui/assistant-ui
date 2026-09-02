import { describe, expect, it } from "vitest";
import { act, createElement, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
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
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const counter = createRenderCounter();
let parses = 0;
const countParses = () => () => {
  parses += 1;
};

const Paragraph = ({ children }: { children?: ReactNode }) => {
  counter.useRender("p");
  return createElement("p", null, children);
};

const components = memoizeMarkdownComponents({ p: Paragraph });

const makeComponents = (defer: boolean) => {
  const Text = () => (
    <MarkdownTextPrimitive
      smooth={false}
      defer={defer}
      components={components}
      remarkPlugins={[countParses]}
    />
  );
  const Message = () => {
    counter.useRender("message");
    return <MessagePrimitive.Parts components={{ Text }} />;
  };
  return { Message };
};

const convertMessage = (m: Msg): ThreadMessageLike => ({
  id: m.id,
  role: m.role,
  content: [{ type: "text", text: m.text }],
});

const PARAGRAPHS = 20;
const document = Array.from(
  { length: PARAGRAPHS },
  (_, i) =>
    `Paragraph ${i} of the streamed answer, with **emphasis** and \`code\`.`,
).join("\n\n");

const mount = (defer = false) => {
  const COMPONENTS = makeComponents(defer);
  let setMessages!: (updater: (prev: Msg[]) => Msg[]) => void;
  const App = () => {
    const [messages, set] = useState<Msg[]>([
      { id: "u1", role: "user", text: "hello" },
      { id: "a1", role: "assistant", text: document },
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
          <ThreadPrimitive.Messages components={COMPONENTS} />,
        )}
      </AssistantRuntimeProvider>
    );
  };
  const root = createRoot(globalThis.document.createElement("div"));
  act(() => root.render(createElement(App)));
  const append = () =>
    act(() =>
      setMessages((prev) =>
        prev.map((m) => (m.id === "a1" ? { ...m, text: `${m.text} tok` } : m)),
      ),
    );
  return { append, unmount: () => act(() => root.unmount()) };
};

describe("markdown streaming", () => {
  // react-markdown re-parses the whole accumulated text on every render and
  // memoizes per hast node, so the paragraph a token lands in renders once and
  // the paragraphs before it not at all. With `defer` off the part update is
  // the only render of the primitive, so the parse runs once per token; a
  // second parse is a regression. The user message renders through the same
  // Text slot, hence the extra paragraph and the two parses at mount.
  it("re-parses the whole message once per token and re-renders only the changed paragraph", () => {
    counter.reset();
    parses = 0;
    const app = mount();
    const MOUNT_PARAGRAPHS = PARAGRAPHS + 1;
    expect(counter.renders("p")).toBe(MOUNT_PARAGRAPHS);
    expect(parses).toBe(2);
    const mountedCommits = counter.commits("thread");

    const TOKENS = 10;
    for (let i = 0; i < TOKENS; i++) app.append();

    expect(counter.renders("p")).toBe(MOUNT_PARAGRAPHS + TOKENS);
    expect(counter.renders("message")).toBe(2);
    expect(parses).toBe(2 + TOKENS);
    expect(counter.commits("thread") - mountedCommits).toBe(2 * TOKENS);
    app.unmount();
  });

  // `defer` buys interruptibility with a second parse: React renders the
  // previous text at normal priority and the new text in the deferred pass,
  // and react-markdown has no incremental mode that would make the first pass
  // free. Collapsing that to one parse is an optimization; a third is a
  // regression.
  it("re-parses once for the previous text and once for the new one when deferred", () => {
    counter.reset();
    parses = 0;
    const app = mount(true);
    const MOUNT_PARAGRAPHS = PARAGRAPHS + 1;
    expect(counter.renders("p")).toBe(MOUNT_PARAGRAPHS);
    expect(parses).toBe(2);
    const mountedCommits = counter.commits("thread");

    const TOKENS = 10;
    for (let i = 0; i < TOKENS; i++) app.append();

    expect(counter.renders("p")).toBe(MOUNT_PARAGRAPHS + TOKENS);
    expect(counter.renders("message")).toBe(2);
    expect(parses).toBe(2 + 2 * TOKENS);
    expect(counter.commits("thread") - mountedCommits).toBe(3 * TOKENS);
    app.unmount();
  });
});
