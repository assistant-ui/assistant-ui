import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { FC } from "react";
import type { Root } from "hast";
import ReactMarkdown from "react-markdown";
import { CodeOverride, compareComponentsByLanguage } from "./CodeOverride";
import { PreContext, PreOverride } from "./PreOverride";
import type {
  CodeComponent,
  CodeHeaderProps,
  PreComponent,
  SyntaxHighlighterProps,
} from "./types";

const Pre: PreComponent = ({ node: _, ...props }) => <pre {...props} />;
const Code: CodeComponent = ({ node: _, ...props }) => <code {...props} />;
const FallbackHighlighter: FC<SyntaxHighlighterProps> = ({
  language,
  code,
}) => <div data-testid="fallback" data-language={language} data-code={code} />;

const makeHighlighter = (id: string): FC<SyntaxHighlighterProps> => {
  const Highlighter: FC<SyntaxHighlighterProps> = ({ language }) => (
    <div data-testid={id} data-language={language} />
  );
  return Highlighter;
};

const render = (
  className: string,
  componentsByLanguage?: Record<
    string,
    { SyntaxHighlighter?: FC<SyntaxHighlighterProps> }
  >,
  CodeHeader: FC<CodeHeaderProps> = () => null,
) =>
  renderToStaticMarkup(
    <PreContext.Provider value={{}}>
      <CodeOverride
        components={{
          Pre,
          Code,
          CodeHeader,
          SyntaxHighlighter: FallbackHighlighter,
        }}
        componentsByLanguage={componentsByLanguage}
        className={className}
      >
        test code
      </CodeOverride>
    </PreContext.Provider>,
  );

describe("CodeOverride language extraction", () => {
  it.each(["c++", "objective-c", "f#"])(
    "dispatches componentsByLanguage for %s",
    (lang) => {
      const html = render(`language-${lang}`, {
        [lang]: { SyntaxHighlighter: makeHighlighter("custom") },
      });
      expect(html).toContain(`data-testid="custom"`);
      expect(html).toContain(`data-language="${lang}"`);
    },
  );

  it("dispatches componentsByLanguage for word-character ids", () => {
    const html = render("language-tsx", {
      tsx: { SyntaxHighlighter: makeHighlighter("custom") },
    });
    expect(html).toContain(`data-testid="custom"`);
    expect(html).toContain(`data-language="tsx"`);
  });

  it("passes the full language id to the fallback highlighter", () => {
    const html = render("language-c++");
    expect(html).toContain(`data-testid="fallback"`);
    expect(html).toContain(`data-language="c++"`);
  });

  it("passes an empty language to the fallback highlighter when no language class is present", () => {
    const html = render("");
    expect(html).toContain(`data-testid="fallback"`);
    expect(html).toContain(`data-language=""`);
  });

  it("passes an empty language to the code header when no language class is present", () => {
    const CodeHeader: FC<CodeHeaderProps> = ({ language }) => (
      <div data-testid="header" data-language={language} />
    );
    const html = render("", undefined, CodeHeader);
    expect(html).toContain(`data-testid="header" data-language=""`);
  });

  it("keeps the highlighter as an empty fence receives code", () => {
    for (const [markdown, code] of [
      ["```js\n```", ""],
      ["```js\n", ""],
      ["```js\nx", "x\n"],
    ]) {
      const html = renderToStaticMarkup(
        <ReactMarkdown
          components={{
            pre: (props) => <PreOverride {...props} fallbackPre={Pre} />,
            code: (props) => (
              <CodeOverride
                {...props}
                components={{
                  Pre,
                  Code,
                  CodeHeader: () => null,
                  SyntaxHighlighter: FallbackHighlighter,
                }}
              />
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>,
      );

      expect(html).toContain(
        `data-testid="fallback" data-language="js" data-code="${code}"`,
      );
    }
  });
});

describe("CodeOverride rehype markup", () => {
  it("keeps decorated code and its language-specific header", () => {
    const rehypeLines = () => (tree: Root) => {
      for (const pre of tree.children) {
        if (pre.type !== "element" || pre.tagName !== "pre") continue;
        for (const code of pre.children) {
          if (code.type !== "element" || code.tagName !== "code") continue;
          code.children = code.children.flatMap<(typeof code.children)[number]>(
            (child) =>
              child.type === "text"
                ? child.value.split(/(?<=\n)/).map((value) => ({
                    type: "element" as const,
                    tagName: "span",
                    properties: { className: ["line"] },
                    children: [{ type: "text" as const, value }],
                  }))
                : [child],
          );
        }
      }
    };
    const code = "const x = 1;\nconst y = 2;\n";
    const html = renderToStaticMarkup(
      <ReactMarkdown
        rehypePlugins={[rehypeLines]}
        components={{
          pre: (props) => <PreOverride {...props} fallbackPre={Pre} />,
          code: (props) => (
            <CodeOverride
              {...props}
              components={{
                Pre,
                Code,
                CodeHeader: () => <header>fallback</header>,
                SyntaxHighlighter: FallbackHighlighter,
              }}
              componentsByLanguage={{
                js: {
                  CodeHeader: ({ code, language }) => (
                    <header data-language={language}>{code}</header>
                  ),
                  SyntaxHighlighter: FallbackHighlighter,
                },
              }}
            />
          ),
        }}
      >
        {"```js\n" + code + "```"}
      </ReactMarkdown>,
    );

    expect(html).toContain(`<header data-language="js">${code}</header>`);
    expect(html).toContain('<span class="line">const x = 1;\n</span>');
    expect(html).toContain('<span class="line">const y = 2;\n</span>');
    expect(html).not.toContain('data-testid="fallback"');
  });
});

describe("compareComponentsByLanguage", () => {
  const Highlighter = makeHighlighter("stable");

  it("treats structurally equal fresh objects as equal", () => {
    expect(
      compareComponentsByLanguage(
        { mermaid: { SyntaxHighlighter: Highlighter } },
        { mermaid: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(true);
  });

  it("detects changed and added languages", () => {
    const Other = makeHighlighter("other");
    expect(
      compareComponentsByLanguage(
        { mermaid: { SyntaxHighlighter: Highlighter } },
        { mermaid: { SyntaxHighlighter: Other } },
      ),
    ).toBe(false);
    expect(
      compareComponentsByLanguage(
        { mermaid: { SyntaxHighlighter: Highlighter } },
        {
          mermaid: { SyntaxHighlighter: Highlighter },
          python: { SyntaxHighlighter: Other },
        },
      ),
    ).toBe(false);
  });

  it("distinguishes same-sized maps with different keys and undefined entries", () => {
    expect(
      compareComponentsByLanguage(
        { a: undefined },
        { b: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(false);
    expect(
      compareComponentsByLanguage(
        { mermaid: undefined },
        { mermaid: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(false);
    expect(
      compareComponentsByLanguage({ a: undefined }, { a: undefined }),
    ).toBe(true);
  });

  it("does not read inherited keys off the next map", () => {
    expect(
      compareComponentsByLanguage(
        { toString: { SyntaxHighlighter: Highlighter } },
        { other: { SyntaxHighlighter: Highlighter } },
      ),
    ).toBe(false);
  });

  it("handles absent maps by identity", () => {
    expect(compareComponentsByLanguage(undefined, undefined)).toBe(true);
    expect(
      compareComponentsByLanguage(undefined, {
        mermaid: { SyntaxHighlighter: Highlighter },
      }),
    ).toBe(false);
  });
});
