import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { FC } from "react";
import { CodeOverride } from "./CodeOverride";
import { PreContext } from "./PreOverride";
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
});
