import { cleanup, render, screen } from "@testing-library/react";
import type { MarkdownTextPrimitiveProps } from "@assistant-ui/react-markdown";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  components: undefined as MarkdownTextPrimitiveProps["components"],
  messagePartText: {
    type: "text",
    text: "```tsx\nconst answer = 42;\n```",
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

vi.mock("@assistant-ui/react-markdown", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/react-markdown")>();
  return {
    ...original,
    MarkdownTextPrimitive: (props: MarkdownTextPrimitiveProps) => {
      mocks.components = props.components;
      return <original.MarkdownTextPrimitive {...props} />;
    },
  };
});

import { MarkdownText } from "./markdown-text";

afterEach(() => {
  cleanup();
  mocks.components = undefined;
});

describe("MarkdownText component overrides", () => {
  it("memoizes a syntax highlighter override while keeping the kit code header", () => {
    const SyntaxHighlighter = vi.fn(({ code }: { code: string }) => (
      <div data-testid="syntax-highlighter">{code}</div>
    ));

    render(<MarkdownText components={{ SyntaxHighlighter }} />);

    expect(screen.getByTestId("syntax-highlighter").textContent).toBe(
      "const answer = 42;\n",
    );
    expect(
      screen.getByText("tsx").closest(".aui-code-header-root"),
    ).not.toBeNull();
    expect(SyntaxHighlighter).toHaveBeenCalledOnce();
    expect(mocks.components?.SyntaxHighlighter).not.toBe(SyntaxHighlighter);
  });

  it("keeps the composed map referentially stable across equal inline overrides", () => {
    const SyntaxHighlighter = ({ code }: { code: string }) => (
      <div data-testid="syntax-highlighter">{code}</div>
    );

    const { rerender } = render(
      <MarkdownText components={{ SyntaxHighlighter }} />,
    );
    const first = mocks.components;
    rerender(<MarkdownText components={{ SyntaxHighlighter }} />);

    expect(mocks.components).toBe(first);
  });

  it("keeps the default html renderers in the composed map with overrides", () => {
    const SyntaxHighlighter = ({ code }: { code: string }) => (
      <div data-testid="syntax-highlighter">{code}</div>
    );

    render(<MarkdownText components={{ SyntaxHighlighter }} />);

    expect(mocks.components?.h1).toBeDefined();
    expect(mocks.components?.p).toBeDefined();
  });

  it("renders the default map with kit classes when no overrides are given", () => {
    mocks.messagePartText.text = "# Heading\n\nparagraph";
    try {
      render(<MarkdownText />);

      const heading = screen.getByText("Heading");
      expect(heading.closest(".aui-md-h1")).not.toBeNull();
      expect(screen.getByText("paragraph").closest(".aui-md-p")).not.toBeNull();
    } finally {
      mocks.messagePartText.text = "```tsx\nconst answer = 42;\n```";
    }
  });

  it("gives a table its own horizontal scroll container", () => {
    mocks.messagePartText.text =
      "| ID |\n| --- |\n| aaaa0000bbbb1111cccc2222dddd3333 |";
    try {
      render(<MarkdownText />);

      const table = screen.getByRole("table");
      const wrapper = table.parentElement;

      expect(wrapper?.classList.contains("aui-md-table-wrapper")).toBe(true);
      expect(wrapper?.classList.contains("overflow-x-auto")).toBe(true);
      expect(table.classList.contains("aui-md-table")).toBe(true);
      expect(table.className).not.toContain("overflow");
    } finally {
      mocks.messagePartText.text = "```tsx\nconst answer = 42;\n```";
    }
  });
});
