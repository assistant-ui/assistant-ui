// @vitest-environment jsdom
import { act, type ComponentPropsWithoutRef, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Element, Root as HastRoot } from "hast";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  messagePartText: {
    type: "text",
    text: "```js\nprobe\n```",
    status: { type: "complete" },
  },
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
import type {
  CodeComponent,
  CodeHeaderProps,
  PreComponent,
  SyntaxHighlighterProps,
} from "../overrides/types";

const roots: Root[] = [];

const injectRawPre = () => (tree: HastRoot) => {
  const pre: Element = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [{ type: "text", value: "raw probe" }],
  };
  tree.children.push(pre);
};

const makePre = (name: string): PreComponent => {
  function UserPre({
    node: _,
    children,
  }: ComponentPropsWithoutRef<"pre"> & { node?: Element | undefined }) {
    return <div data-component={`pre-${name}`}>{children}</div>;
  }
  return UserPre;
};

const makeCode = (name: string): CodeComponent => {
  function UserCode({
    node: _,
    children,
  }: ComponentPropsWithoutRef<"code"> & { node?: Element | undefined }) {
    return <span data-component={`code-${name}`}>{children}</span>;
  }
  return UserCode;
};

const makeHighlighter = (
  name: string,
): ComponentType<SyntaxHighlighterProps> => {
  function UserHighlighter({ code }: SyntaxHighlighterProps) {
    return <div data-highlighter={name}>{code}</div>;
  }
  return UserHighlighter;
};

const makeHeader = (name: string): ComponentType<CodeHeaderProps> => {
  function UserHeader() {
    return <div data-header={name} />;
  }
  return UserHeader;
};

beforeEach(() => {
  mocks.messagePartText = {
    type: "text",
    text: "```js\nprobe\n```",
    status: { type: "complete" },
  };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  for (const root of roots) act(() => root.unmount());
  roots.length = 0;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const mount = () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  return { container, root };
};

describe("MarkdownTextPrimitive renderer replacement", () => {
  it("updates the pre renderer for an already-rendered fenced block", () => {
    const { container, root } = mount();
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          components={{ pre: makePre("old") }}
        />,
      ),
    );
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          components={{ pre: makePre("new") }}
        />,
      ),
    );

    expect(container.querySelector('[data-component="pre-old"]')).toBeNull();
    expect(
      container.querySelector('[data-component="pre-new"]'),
    ).not.toBeNull();
  });

  it("updates the code renderer for an already-rendered fenced block", () => {
    const { container, root } = mount();
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          components={{ code: makeCode("old") }}
        />,
      ),
    );
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          components={{ code: makeCode("new") }}
        />,
      ),
    );

    expect(container.querySelector('[data-component="code-old"]')).toBeNull();
    expect(
      container.querySelector('[data-component="code-new"]'),
    ).not.toBeNull();
  });

  it("keeps highlighter and header replacements current", () => {
    const { container, root } = mount();
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          components={{
            SyntaxHighlighter: makeHighlighter("old"),
            CodeHeader: makeHeader("old"),
          }}
        />,
      ),
    );
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          components={{
            SyntaxHighlighter: makeHighlighter("new"),
            CodeHeader: makeHeader("new"),
          }}
        />,
      ),
    );

    expect(container.querySelector('[data-highlighter="old"]')).toBeNull();
    expect(container.querySelector('[data-highlighter="new"]')).not.toBeNull();
    expect(container.querySelector('[data-header="old"]')).toBeNull();
    expect(container.querySelector('[data-header="new"]')).not.toBeNull();
  });

  it("updates the fallback pre renderer for a code-less raw pre", () => {
    const { container, root } = mount();
    const rehypePlugins = [injectRawPre];
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          rehypePlugins={rehypePlugins}
          components={{ pre: makePre("old") }}
        />,
      ),
    );
    act(() =>
      root.render(
        <MarkdownTextPrimitive
          smooth={false}
          rehypePlugins={rehypePlugins}
          components={{ pre: makePre("new") }}
        />,
      ),
    );

    expect(
      container.querySelectorAll('[data-component="pre-old"]').length,
    ).toBe(0);
    expect(
      Array.from(container.querySelectorAll('[data-component="pre-new"]')).some(
        (pre) => pre.textContent === "raw probe",
      ),
    ).toBe(true);
  });
});
