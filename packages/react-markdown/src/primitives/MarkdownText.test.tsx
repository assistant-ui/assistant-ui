import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Element, Root } from "hast";
import type { ComponentType } from "react";

const mocks = vi.hoisted(() => {
  const smoothState = { initialized: false, previousText: "" };
  return {
    messagePartText: {
      type: "text" as const,
      text: "",
      status: { type: "running" as const },
    },
    smoothState,
    useSmooth: vi.fn((part: { text: string }) => {
      if (
        smoothState.initialized &&
        !part.text.startsWith(smoothState.previousText)
      ) {
        return { ...part, text: "" };
      }
      smoothState.initialized = true;
      smoothState.previousText = part.text;
      return part;
    }),
  };
});

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    useMessagePartText: () => mocks.messagePartText,
    INTERNAL: {
      ...original.INTERNAL,
      useSmooth: mocks.useSmooth,
      useSmoothStatus: () => ({ type: "complete" }),
      withSmoothContextProvider: (component: ComponentType) => component,
    },
  };
});

import { MarkdownTextPrimitive } from "./MarkdownText";
import { escapeCurrencyDollars, normalizeMathDelimiters } from "../preprocess";

const injectRawPre = () => (tree: Root) => {
  const pre: Element = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [{ type: "text", value: "  indented\n  text" }],
  };
  tree.children.push(pre);
};

const renderStreamingPrefixes = (
  prefixes: string[],
  preprocess: (text: string) => string,
) => {
  mocks.smoothState.initialized = false;
  mocks.smoothState.previousText = "";
  mocks.useSmooth.mockClear();

  return prefixes.map((text) => {
    mocks.messagePartText = { ...mocks.messagePartText, text };
    return renderToStaticMarkup(
      <MarkdownTextPrimitive preprocess={preprocess} />,
    );
  });
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

describe("MarkdownTextPrimitive preprocessing during smooth streaming", () => {
  it("smooths raw prefixes before normalizing completed math", () => {
    const slash = String.fromCharCode(92);
    const prefixes = [
      `Consider ${slash}[ a^2+b^2=c^2 ${slash}`,
      `Consider ${slash}[ a^2+b^2=c^2 ${slash}]`,
    ];

    const html = renderStreamingPrefixes(prefixes, normalizeMathDelimiters);

    expect(mocks.useSmooth.mock.calls.map(([part]) => part.text)).toEqual(
      prefixes,
    );
    expect(html[1]).toContain("$$a^2+b^2=c^2$$");
  });

  it("smooths raw prefixes before escaping a newly completed currency amount", () => {
    const prefixes = ["costs $", "costs $5"];

    const html = renderStreamingPrefixes(prefixes, escapeCurrencyDollars);

    expect(mocks.useSmooth.mock.calls.map(([part]) => part.text)).toEqual(
      prefixes,
    );
    expect(html[1]).toContain("costs $5");
  });
});
