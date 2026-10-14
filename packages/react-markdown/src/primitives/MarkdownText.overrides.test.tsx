// @vitest-environment jsdom
import { act, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import type { Root } from "hast";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { PreComponent } from "../overrides/types";
import {
  MarkdownTextPrimitive,
  type MarkdownTextPrimitiveProps,
} from "./MarkdownText";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const Overrides = createContext<MarkdownTextPrimitiveProps>({});
const Text = () => (
  <MarkdownTextPrimitive smooth={false} {...useContext(Overrides)} />
);
const Message = () => <MessagePrimitive.Parts components={{ Text }} />;
const components = { Message };
const messages: ThreadMessageLike[] = [
  {
    id: "answer",
    role: "assistant",
    content: [{ type: "text", text: "```js\nconst x = 1;\n```" }],
  },
];
const convertMessage = (message: ThreadMessageLike) => message;
const App = ({ overrides }: { overrides: MarkdownTextPrimitiveProps }) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Overrides.Provider value={overrides}>
        <ThreadPrimitive.Messages components={components} />
      </Overrides.Provider>
    </AssistantRuntimeProvider>
  );
};
const Before = () => <span>before</span>;
const After = () => <span>after</span>;
const BeforePre: PreComponent = ({ node: _, ...props }) => (
  <pre data-variant="before" {...props} />
);
const AfterPre: PreComponent = ({ node: _, ...props }) => (
  <pre data-variant="after" {...props} />
);
const injectRawPre = () => (tree: Root) => {
  tree.children.push({
    type: "element",
    tagName: "pre",
    properties: {},
    children: [{ type: "text", value: "raw" }],
  });
};

describe("MarkdownText overrides", () => {
  it.each(["global highlighter", "language highlighter", "code header"])(
    "uses %s on a fresh mount",
    (kind) => {
      const overrides: MarkdownTextPrimitiveProps =
        kind === "language highlighter"
          ? { componentsByLanguage: { js: { SyntaxHighlighter: After } } }
          : {
              components: {
                [kind === "code header" ? "CodeHeader" : "SyntaxHighlighter"]:
                  After,
              },
            };
      const container = document.createElement("div");
      const root = createRoot(container);
      try {
        act(() => root.render(<App overrides={overrides} />));
        expect(container.textContent).toContain("after");
      } finally {
        act(() => root.unmount());
      }
    },
  );
});

describe("MarkdownText override updates", () => {
  it.each(["global highlighter", "language highlighter", "code header"])(
    "updates %s without changing text",
    (kind) => {
      const props = (Component: typeof Before): MarkdownTextPrimitiveProps =>
        kind === "language highlighter"
          ? { componentsByLanguage: { js: { SyntaxHighlighter: Component } } }
          : {
              components: {
                [kind === "code header" ? "CodeHeader" : "SyntaxHighlighter"]:
                  Component,
              },
            };
      const container = document.createElement("div");
      const root = createRoot(container);
      try {
        act(() => root.render(<App overrides={props(Before)} />));
        expect(container.textContent).toContain("before");
        act(() => root.render(<App overrides={props(After)} />));
        expect(container.textContent).toContain("after");
        expect(container.textContent).not.toContain("before");
      } finally {
        act(() => root.unmount());
      }
    },
  );

  it("updates a raw pre without changing text", () => {
    const props = (pre: PreComponent): MarkdownTextPrimitiveProps => ({
      rehypePlugins: [injectRawPre],
      components: { pre },
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    const rawPre = () =>
      Array.from(container.querySelectorAll("pre")).find(
        (pre) => pre.textContent === "raw",
      );
    try {
      act(() => root.render(<App overrides={props(BeforePre)} />));
      expect(rawPre()?.getAttribute("data-variant")).toBe("before");
      act(() => root.render(<App overrides={props(AfterPre)} />));
      expect(rawPre()?.getAttribute("data-variant")).toBe("after");
    } finally {
      act(() => root.unmount());
    }
  });
});
