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

const render = (markdown: string) =>
  renderToStaticMarkup(
    <ReactMarkdown
      rehypePlugins={[injectRawPre]}
      components={{ pre: PreOverride, code: CodeWithContext }}
    >
      {markdown}
    </ReactMarkdown>,
  );

describe("PreOverride", () => {
  it("keeps the pre element for a pre without a code child", () => {
    const html = render("");

    expect(html).toContain("<pre>  indented\n  text</pre>");
  });

  it("still routes fenced code blocks through the code override", () => {
    const html = render("```\nhello\n```");

    expect(html).toContain("<code");
    expect(html).toContain("hello");
    expect(html.match(/<pre/g)?.length).toBe(2);
  });
});
