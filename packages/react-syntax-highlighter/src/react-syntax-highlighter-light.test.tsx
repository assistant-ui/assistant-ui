import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef, FC } from "react";
import {
  Light,
  LightAsync,
  PrismAsyncLight,
  PrismLight,
} from "react-syntax-highlighter";
import hljsJavascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import prismJavascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { afterEach, describe, expect, it } from "vitest";
import {
  makeLightAsyncSyntaxHighlighter,
  makeLightSyntaxHighlighter,
  makePrismAsyncLightSyntaxHighlighter,
  makePrismLightSyntaxHighlighter,
} from "./react-syntax-highlighter-light";

afterEach(cleanup);

const Pre: FC<ComponentPropsWithoutRef<"pre">> = (props) => (
  <pre data-testid="pre" {...props} />
);
const Code: FC<ComponentPropsWithoutRef<"code">> = (props) => (
  <code data-testid="code" {...props} />
);

const components: SyntaxHighlighterProps["components"] = { Pre, Code };

const code = "const answer = 42;";

const renderJs = (SyntaxHighlighter: FC<SyntaxHighlighterProps>) => {
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
  return codeEl;
};

describe("react-syntax-highlighter-light", () => {
  it("makeLightSyntaxHighlighter highlights languages registered on Light", () => {
    Light.registerLanguage("javascript", hljsJavascript);
    const SyntaxHighlighter = makeLightSyntaxHighlighter({
      useInlineStyles: false,
    });

    const codeEl = renderJs(SyntaxHighlighter);
    expect(codeEl.querySelector(".hljs-keyword")?.textContent).toBe("const");
  });

  it("makePrismLightSyntaxHighlighter highlights languages registered on PrismLight", () => {
    PrismLight.registerLanguage("javascript", prismJavascript);
    const SyntaxHighlighter = makePrismLightSyntaxHighlighter({
      useInlineStyles: false,
    });

    const codeEl = renderJs(SyntaxHighlighter);
    expect(codeEl.querySelector(".token.keyword")?.textContent).toBe("const");
  });

  it("makeLightAsyncSyntaxHighlighter highlights with highlight.js once LightAsync is ready", async () => {
    LightAsync.registerLanguage("javascript", hljsJavascript);
    const SyntaxHighlighter = makeLightAsyncSyntaxHighlighter({
      useInlineStyles: false,
    });

    const codeEl = renderJs(SyntaxHighlighter);
    await expect
      .poll(() => codeEl.querySelector(".hljs-keyword")?.textContent)
      .toBe("const");
  });

  it("makePrismAsyncLightSyntaxHighlighter highlights with Prism once PrismAsyncLight is ready", async () => {
    PrismAsyncLight.registerLanguage("javascript", prismJavascript);
    const SyntaxHighlighter = makePrismAsyncLightSyntaxHighlighter({
      useInlineStyles: false,
    });

    const codeEl = renderJs(SyntaxHighlighter);
    await expect
      .poll(() => codeEl.querySelector(".token.keyword")?.textContent)
      .toBe("const");
  });
});
