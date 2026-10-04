import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef, FC } from "react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { afterEach, describe, expect, it } from "vitest";
import {
  makePrismAsyncSyntaxHighlighter,
  makePrismSyntaxHighlighter,
  makeSyntaxHighlighter,
} from "./react-syntax-highlighter-full";

afterEach(cleanup);

const Pre: FC<ComponentPropsWithoutRef<"pre">> = (props) => (
  <pre data-testid="pre" {...props} />
);
const Code: FC<ComponentPropsWithoutRef<"code">> = (props) => (
  <code data-testid="code" {...props} />
);

const components: SyntaxHighlighterProps["components"] = { Pre, Code };

const code = "const answer = 42;";

describe("react-syntax-highlighter-full", () => {
  it("makeSyntaxHighlighter highlights with highlight.js", () => {
    const SyntaxHighlighter = makeSyntaxHighlighter({ useInlineStyles: false });

    render(
      <SyntaxHighlighter
        components={components}
        language="javascript"
        code={code}
      />,
    );

    const codeEl = screen.getByTestId("code");
    expect(screen.getByTestId("pre").contains(codeEl)).toBe(true);
    expect(codeEl.textContent).toBe(code);
    expect(codeEl.querySelector(".hljs-keyword")?.textContent).toBe("const");
    expect(codeEl.querySelector(".token")).toBeNull();
  });

  it("makePrismSyntaxHighlighter highlights with Prism", () => {
    const SyntaxHighlighter = makePrismSyntaxHighlighter({
      useInlineStyles: false,
    });

    render(
      <SyntaxHighlighter
        components={components}
        language="javascript"
        code={code}
      />,
    );

    const codeEl = screen.getByTestId("code");
    expect(codeEl.textContent).toBe(code);
    expect(codeEl.querySelector(".token.keyword")?.textContent).toBe("const");
    expect(codeEl.querySelector(".hljs-keyword")).toBeNull();
  });

  it("makePrismAsyncSyntaxHighlighter highlights once the language loads", async () => {
    const SyntaxHighlighter = makePrismAsyncSyntaxHighlighter({
      useInlineStyles: false,
    });

    render(
      <SyntaxHighlighter
        components={components}
        language="javascript"
        code={code}
      />,
    );

    const codeEl = screen.getByTestId("code");
    expect(codeEl.textContent).toBe(code);
    await expect
      .poll(() => codeEl.querySelector(".token.keyword")?.textContent)
      .toBe("const");
  });

  it("renders unknown languages as plain text", () => {
    const SyntaxHighlighter = makePrismSyntaxHighlighter({
      useInlineStyles: false,
    });

    render(
      <SyntaxHighlighter
        components={components}
        language="not-a-language"
        code={code}
      />,
    );

    const codeEl = screen.getByTestId("code");
    expect(codeEl.textContent).toBe(code);
    expect(codeEl.querySelector(".token")).toBeNull();
  });

  it("applies the config to the rendered output", () => {
    const SyntaxHighlighter = makePrismSyntaxHighlighter({
      useInlineStyles: false,
      showLineNumbers: true,
    });

    render(
      <SyntaxHighlighter
        components={components}
        language="javascript"
        code={"a\nb\nc"}
      />,
    );

    const lineNumbers = screen
      .getByTestId("code")
      .querySelectorAll(".linenumber");
    expect([...lineNumbers].map((el) => el.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
});
