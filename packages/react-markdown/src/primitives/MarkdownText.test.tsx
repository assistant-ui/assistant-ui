import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Element, Root } from "hast";
import type { ComponentType } from "react";

const mocks = vi.hoisted(() => ({
  messagePartText: { type: "text", text: "", status: { type: "complete" } },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    useMessagePartText: () => mocks.messagePartText,
    INTERNAL: {
      ...original.INTERNAL,
      useSmooth: (part: { text: string }) => part,
      useSmoothStatus: () => ({ type: "complete" }),
      withSmoothContextProvider: (component: ComponentType) => component,
    },
  };
});

import { MarkdownTextPrimitive } from "./MarkdownText";

const injectRawPre = () => (tree: Root) => {
  const pre: Element = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [{ type: "text", value: "  indented\n  text" }],
  };
  tree.children.push(pre);
};

describe("MarkdownTextPrimitive raw pre wiring", () => {
  it("renders a code-less pre through the consumer's pre component", () => {
    const UserPre = ({
      node: _,
      ...props
    }: Record<string, unknown> & { node?: Element }) => (
      <pre className="user-pre" {...props} />
    );

    const html = renderToStaticMarkup(
      <MarkdownTextPrimitive
        rehypePlugins={[injectRawPre]}
        components={{ pre: UserPre }}
      />,
    );

    expect(html).toContain('<pre class="user-pre">  indented\n  text</pre>');
  });
});
