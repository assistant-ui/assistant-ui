import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import type { Element, Root } from "hast";
import { PreOverride } from "./PreOverride";
import { CodeOverride } from "./CodeOverride";
import type {
  CodeComponent,
  PreComponent,
  SyntaxHighlighterProps,
} from "./types";
import type { FC } from "react";

const Pre: PreComponent = ({ node: _, ...props }) => <pre {...props} />;
const Code: CodeComponent = ({ node: _, ...props }) => <code {...props} />;
const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ code }) => (
  <pre>
    <code>{code}</code>
  </pre>
);

const CodeWithContext: CodeComponent = (props) => (
  <CodeOverride
    components={{ Pre, Code, SyntaxHighlighter, CodeHeader: () => null }}
    {...props}
  />
);

const injectRawPre = () => (tree: Root) => {
  const pre: Element = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [{ type: "text", value: "  indented\n  text" }],
  };
  tree.children.push(pre);
};

const PlainPre: PreComponent = ({ node: _, ...props }) => <pre {...props} />;
const PreWithPlainFallback: PreComponent = (props) => (
  <PreOverride fallbackPre={PlainPre} {...props} />
);

const render = (markdown: string) =>
  renderToStaticMarkup(
    <ReactMarkdown
      rehypePlugins={[injectRawPre]}
      components={{ pre: PreWithPlainFallback, code: CodeWithContext }}
    >
      {markdown}
    </ReactMarkdown>,
  );

describe("PreOverride", () => {
  it("routes a code-less pre through the consumer's pre component", () => {
    const UserPre: PreComponent = ({ node: _, ...props }) => (
      <pre className="user-pre" {...props} />
    );
    const PreWithFallback: PreComponent = (props) => (
      <PreOverride fallbackPre={UserPre} {...props} />
    );
    const html = renderToStaticMarkup(
      <ReactMarkdown
        rehypePlugins={[injectRawPre]}
        components={{ pre: PreWithFallback, code: CodeWithContext }}
      >
        {""}
      </ReactMarkdown>,
    );

    expect(html).toContain('<pre class="user-pre">  indented\n  text</pre>');
  });

  it("still routes fenced code blocks through the code override", () => {
    const html = render("```\nhello\n```");

    expect(html).toContain("<code");
    expect(html).toContain("hello");
    expect(html.match(/<pre/g)?.length).toBe(2);
  });
});
