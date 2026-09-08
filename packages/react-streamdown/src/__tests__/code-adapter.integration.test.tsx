import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createCodeAdapter } from "../adapters/code-adapter";
import { PreOverride } from "../adapters/PreOverride";
import type { Root } from "hast";
import { Streamdown } from "streamdown";

afterEach(cleanup);

describe("createCodeAdapter integration", () => {
  describe("inline code detection", () => {
    it("renders inline code when data-block is absent", () => {
      const AdaptedCode = createCodeAdapter({});
      render(<AdaptedCode className="inline">console.log</AdaptedCode>);

      const codeElement = screen.getByText("console.log");
      expect(codeElement.tagName).toBe("CODE");
      expect(codeElement.className).toContain("aui-streamdown-inline-code");
    });

    it("applies inline class along with user class", () => {
      const AdaptedCode = createCodeAdapter({});
      render(<AdaptedCode className="custom-class">code</AdaptedCode>);

      const codeElement = screen.getByText("code");
      expect(codeElement.className).toContain("aui-streamdown-inline-code");
      expect(codeElement.className).toContain("custom-class");
    });
  });

  describe("code block detection", () => {
    it("uses SyntaxHighlighter when data-block is present", () => {
      const MockSyntax = vi.fn(({ code, language }) => (
        <div data-testid="syntax">{`${language}: ${code}`}</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <AdaptedCode className="language-javascript" data-block="true">
          const x = 1
        </AdaptedCode>,
      );

      expect(screen.getByTestId("syntax").textContent).toBe(
        "javascript: const x = 1",
      );
      expect(MockSyntax).toHaveBeenCalled();
      const callArgs = MockSyntax.mock.calls[0]![0];
      expect(callArgs.language).toBe("javascript");
      expect(callArgs.code).toBe("const x = 1");
    });

    it("renders CodeHeader when provided", () => {
      const MockHeader = vi.fn(({ language }) => (
        <div data-testid="header">{language}</div>
      ));
      const MockSyntax = vi.fn(({ code }) => (
        <div data-testid="syntax">{code}</div>
      ));

      const AdaptedCode = createCodeAdapter({
        CodeHeader: MockHeader,
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <AdaptedCode className="language-python" data-block="true">
          print("hi")
        </AdaptedCode>,
      );

      expect(screen.getByTestId("header").textContent).toBe("python");
      expect(screen.getByTestId("syntax").textContent).toBe('print("hi")');
    });

    it("re-renders when data-block changes from absent to present", () => {
      const MockSyntax = vi.fn(({ code }) => (
        <div data-testid="syntax">{code}</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      const { rerender } = render(
        <AdaptedCode className="language-js">const x = 1;</AdaptedCode>,
      );

      expect(screen.queryByTestId("syntax")).toBeNull();

      rerender(
        <AdaptedCode className="language-js" data-block="true">
          const x = 1;
        </AdaptedCode>,
      );

      expect(screen.getByTestId("syntax").textContent).toBe("const x = 1;");
      expect(MockSyntax).toHaveBeenCalledTimes(1);
    });
  });

  describe("language detection", () => {
    it.each([
      ["language-javascript", "javascript"],
      ["language-typescript", "typescript"],
      ["language-python", "python"],
      ["language-rust", "rust"],
      ["language-go", "go"],
      ["language-c++", "c++"],
      ["language-c#", "c#"],
      ["language-", ""],
      ["", ""],
      [undefined, ""],
    ])("extracts %s as %s", (className, expected) => {
      const MockSyntax = vi.fn(({ language }) => (
        <div data-testid="syntax">{language}</div>
      ));
      const AdaptedCode = createCodeAdapter({ SyntaxHighlighter: MockSyntax });

      render(
        <AdaptedCode className={className} data-block="true">
          code
        </AdaptedCode>,
      );

      expect(screen.getByTestId("syntax").textContent).toBe(expected);
    });
  });

  describe("componentsByLanguage", () => {
    it("uses language-specific SyntaxHighlighter for matching language", () => {
      const PythonSyntax = vi.fn(() => (
        <div data-testid="python">python specific</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: () => <div>default</div>,
        componentsByLanguage: { python: { SyntaxHighlighter: PythonSyntax } },
      });

      render(
        <AdaptedCode className="language-python" data-block="true">
          code
        </AdaptedCode>,
      );

      expect(screen.getByTestId("python")).toBeDefined();
      expect(PythonSyntax).toHaveBeenCalled();
    });

    it("uses default SyntaxHighlighter for non-matching language", () => {
      const DefaultSyntax = vi.fn(() => (
        <div data-testid="default">default</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: DefaultSyntax,
        componentsByLanguage: { python: { SyntaxHighlighter: () => <div /> } },
      });

      render(
        <AdaptedCode className="language-javascript" data-block="true">
          code
        </AdaptedCode>,
      );

      expect(screen.getByTestId("default")).toBeDefined();
    });

    it("uses language-specific CodeHeader", () => {
      const DefaultHeader = vi.fn(() => (
        <div data-testid="default-header">default</div>
      ));
      const MermaidHeader = vi.fn(() => (
        <div data-testid="mermaid-header">mermaid</div>
      ));
      const MockSyntax = vi.fn(() => <div>syntax</div>);

      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
        CodeHeader: DefaultHeader,
        componentsByLanguage: {
          mermaid: { CodeHeader: MermaidHeader },
        },
      });

      render(
        <AdaptedCode className="language-mermaid" data-block="true">
          code
        </AdaptedCode>,
      );

      expect(screen.getByTestId("mermaid-header")).toBeDefined();
    });
  });

  describe("code extraction", () => {
    it("extracts string children", () => {
      const MockSyntax = vi.fn(({ code }) => (
        <div data-testid="syntax">{code}</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <AdaptedCode className="language-js" data-block="true">
          const x = 1;
        </AdaptedCode>,
      );

      expect(screen.getByTestId("syntax").textContent).toBe("const x = 1;");
    });

    it("keeps rehype markup and passes its text to the code header", () => {
      const rehypeLines = () => (tree: Root) => {
        for (const pre of tree.children) {
          if (pre.type !== "element" || pre.tagName !== "pre") continue;
          pre.properties = {
            ...pre.properties,
            className: ["shiki"],
            "data-theme": "github-dark",
          };
          for (const code of pre.children) {
            if (code.type !== "element" || code.tagName !== "code") continue;
            code.children = code.children.flatMap<
              (typeof code.children)[number]
            >((child) =>
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
      const AdaptedCode = createCodeAdapter({
        CodeHeader: ({ code }) => <header>{code}</header>,
        SyntaxHighlighter: ({ code }) => <pre data-rehighlighted>{code}</pre>,
      });
      const code = "const x = 1;\nconst y = 2;\n";
      const { container } = render(
        <Streamdown
          components={{ code: AdaptedCode, pre: PreOverride }}
          rehypePlugins={[rehypeLines]}
        >
          {"```js\n" + code + "```"}
        </Streamdown>,
      );

      expect(container.querySelector("header")?.textContent).toBe(code);
      expect(container.querySelector("pre > code")?.textContent).toBe(code);
      const pre = container.querySelector("pre");
      expect(pre?.className).toBe("shiki");
      expect(pre?.getAttribute("data-theme")).toBe("github-dark");
      expect(
        Array.from(
          container.querySelectorAll("pre > code > span.line"),
          (line) => line.textContent,
        ),
      ).toEqual(["const x = 1;\n", "const y = 2;\n"]);
      expect(container.querySelector("[data-rehighlighted]")).toBeNull();
    });

    it("keeps the highlighter as an empty fence receives code", () => {
      const AdaptedCode = createCodeAdapter({
        CodeHeader: ({ code }) => <header data-testid="header">{code}</header>,
        SyntaxHighlighter: ({ code }) => <pre data-testid="syntax">{code}</pre>,
      });
      const components = { code: AdaptedCode, pre: PreOverride };
      const { rerender } = render(
        <Streamdown components={components}>{"```js\n```"}</Streamdown>,
      );

      expect(screen.getByTestId("syntax").textContent).toBe("");
      expect(screen.getByTestId("header").textContent).toBe("");
      rerender(<Streamdown components={components}>{"```js\n"}</Streamdown>);
      expect(screen.getByTestId("syntax").textContent).toBe("");
      expect(screen.getByTestId("header").textContent).toBe("");
      rerender(<Streamdown components={components}>{"```js\nx"}</Streamdown>);
      expect(screen.getByTestId("syntax").textContent).toBe("x\n");
      expect(screen.getByTestId("header").textContent).toBe("x\n");
    });

    it("omits null and boolean children from the code header", () => {
      const AdaptedCode = createCodeAdapter({
        CodeHeader: ({ code }) => <header>{code}</header>,
      });
      const { container } = render(
        <AdaptedCode data-block="true">
          {[null, false, undefined, true, ";\n"]}
        </AdaptedCode>,
      );

      expect(container.querySelector("header")?.textContent).toBe(";\n");
      expect(container.querySelector("pre > code")?.textContent).toBe(";\n");
    });
  });

  describe("fallback when no custom SyntaxHighlighter", () => {
    it("wraps the fallback <code> in a <pre> to preserve whitespace", () => {
      const AdaptedCode = createCodeAdapter({});

      const { container } = render(
        <AdaptedCode className="language-js" data-block="true">
          code
        </AdaptedCode>,
      );

      const codeElement = container.querySelector("pre > code");
      expect(codeElement).not.toBeNull();
      expect(codeElement?.className).toBe("language-js");
      expect(codeElement?.textContent).toBe("code");
      expect(codeElement?.className).not.toContain(
        "aui-streamdown-inline-code",
      );
    });

    it("renders CodeHeader above the <pre><code> fallback when provided", () => {
      const MockHeader = vi.fn(({ language }) => (
        <div data-testid="header">{language}</div>
      ));
      const AdaptedCode = createCodeAdapter({ CodeHeader: MockHeader });

      const { container } = render(
        <AdaptedCode className="language-python" data-block="true">
          print("hi")
        </AdaptedCode>,
      );

      expect(screen.getByTestId("header").textContent).toBe("python");
      const codeElement = container.querySelector("pre > code");
      expect(codeElement).not.toBeNull();
      expect(codeElement?.textContent).toBe('print("hi")');
    });

    it("renders <pre><code> fallback for unmatched language in componentsByLanguage", () => {
      const PythonSyntax = vi.fn(() => <div data-testid="python">py</div>);
      const AdaptedCode = createCodeAdapter({
        componentsByLanguage: { python: { SyntaxHighlighter: PythonSyntax } },
      });

      const { container } = render(
        <AdaptedCode className="language-javascript" data-block="true">
          const x = 1;
        </AdaptedCode>,
      );

      expect(PythonSyntax).not.toHaveBeenCalled();
      const codeElement = container.querySelector("pre > code");
      expect(codeElement).not.toBeNull();
      expect(codeElement?.textContent).toBe("const x = 1;");
    });
  });

  describe("Pre and Code component props", () => {
    it("passes Pre and Code components to SyntaxHighlighter", () => {
      const MockSyntax = vi.fn(({ components }) => {
        const { Pre, Code } = components;
        return (
          <Pre>
            <Code data-testid="inner-code">test</Code>
          </Pre>
        );
      });

      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <AdaptedCode className="language-js" data-block="true">
          test
        </AdaptedCode>,
      );

      expect(screen.getByTestId("inner-code")).toBeDefined();
    });

    it("default Pre strips node prop", () => {
      const MockSyntax = vi.fn(({ components }) => {
        const { Pre } = components;
        return (
          <Pre node={undefined} data-testid="pre">
            content
          </Pre>
        );
      });

      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <AdaptedCode className="language-js" data-block="true">
          test
        </AdaptedCode>,
      );

      const preElement = screen.getByTestId("pre");
      expect(preElement.tagName).toBe("PRE");
    });

    it("default Code strips node prop", () => {
      const MockSyntax = vi.fn(({ components }) => {
        const { Code } = components;
        return (
          <Code node={undefined} data-testid="code">
            content
          </Code>
        );
      });

      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <AdaptedCode className="language-js" data-block="true">
          test
        </AdaptedCode>,
      );

      const codeElement = screen.getByTestId("code");
      expect(codeElement.tagName).toBe("CODE");
    });
  });

  describe("PreOverride + AdaptedCode end-to-end", () => {
    it("data-block flows from PreOverride through cloneElement to AdaptedCode", () => {
      const MockSyntax = vi.fn(({ code, language }) => (
        <div data-testid="syntax">{`${language}: ${code}`}</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <PreOverride>
          <AdaptedCode className="language-python">print("hello")</AdaptedCode>
        </PreOverride>,
      );

      expect(screen.getByTestId("syntax").textContent).toBe(
        'python: print("hello")',
      );
    });

    it("renders inline code when AdaptedCode is outside PreOverride", () => {
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: () => <div data-testid="syntax">block</div>,
      });

      render(<AdaptedCode className="language-js">code</AdaptedCode>);

      const codeElement = screen.getByText("code");
      expect(codeElement.className).toContain("aui-streamdown-inline-code");
    });
  });
});
