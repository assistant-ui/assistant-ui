import { beforeEach, describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Element, Root } from "hast";
import type { ComponentProps, ComponentType } from "react";

const mocks = vi.hoisted(() => ({
  messagePartText: { type: "text", text: "", status: { type: "complete" } },
  smooth: vi.fn((part: { text: string }) => part),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    useMessagePartText: () => mocks.messagePartText,
    INTERNAL: {
      ...original.INTERNAL,
      useSmooth: (part: { text: string }) => mocks.smooth(part),
      useSmoothStatus: () => ({ type: "complete" }),
      withSmoothContextProvider: (component: ComponentType) => component,
    },
  };
});

import { MarkdownTextPrimitive } from "./MarkdownText";
import { normalizeMathDelimiters } from "../preprocess";

beforeEach(() => {
  mocks.messagePartText = {
    type: "text",
    text: "",
    status: { type: "complete" },
  };
  mocks.smooth.mockImplementation((part) => part);
});

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
    }: ComponentProps<"pre"> & { node?: Element | undefined }) => (
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

describe("MarkdownTextPrimitive preprocess wiring", () => {
  const streamed = String.raw`Consider \[ a^2+b^2=c^2 \] and more`;
  // the closing bracket has arrived but the trailing prose has not
  const revealed = String.raw`Consider \[ a^2+b^2=c^2 \]`;

  it("smooths the raw text and preprocesses only what has been revealed", () => {
    mocks.messagePartText = {
      type: "text",
      text: streamed,
      status: { type: "running" },
    };
    mocks.smooth.mockImplementation((part) => ({ ...part, text: revealed }));

    const html = renderToStaticMarkup(
      <MarkdownTextPrimitive preprocess={normalizeMathDelimiters} />,
    );

    // smoothing has to see the raw accumulated text, otherwise a rewrite of
    // already-revealed characters reads as a discontinuity and restarts it
    expect(mocks.smooth).toHaveBeenCalledWith(
      expect.objectContaining({ text: streamed }),
    );
    expect(html).toContain("$$a^2+b^2=c^2$$");
    expect(html).not.toContain("and more");
  });

  it("preprocesses the whole message once it is fully revealed", () => {
    mocks.messagePartText = {
      type: "text",
      text: streamed,
      status: { type: "complete" },
    };
    mocks.smooth.mockImplementation((part) => part);

    const html = renderToStaticMarkup(
      <MarkdownTextPrimitive preprocess={normalizeMathDelimiters} />,
    );

    expect(html).toContain("$$a^2+b^2=c^2$$");
    expect(html).toContain("and more");
  });
});
