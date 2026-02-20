import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { createCodeAdapter } from "../adapters/code-adapter";
import { PreContext } from "../adapters/PreOverride";

afterEach(cleanup);

// Wrapper to provide PreContext (simulates being inside a code block)
function CodeBlockWrapper({ children }: { children: ReactNode }) {
  return (
    <PreContext.Provider value={{ className: "language-javascript" }}>
      {children}
    </PreContext.Provider>
  );
}

describe("createCodeAdapter integration", () => {
  describe("inline code detection", () => {
    it("renders inline code when not inside PreContext", () => {
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
    it("uses SyntaxHighlighter when inside PreContext", () => {
      const MockSyntax = vi.fn(({ code, language }) => (
        <div data-testid="syntax">{`${language}: ${code}`}</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <CodeBlockWrapper>
          <AdaptedCode className="language-javascript">const x = 1</AdaptedCode>
        </CodeBlockWrapper>,
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
        <CodeBlockWrapper>
          <AdaptedCode className="language-python">print("hi")</AdaptedCode>
        </CodeBlockWrapper>,
      );

      expect(screen.getByTestId("header").textContent).toBe("python");
      expect(screen.getByTestId("syntax").textContent).toBe('print("hi")');
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
        <CodeBlockWrapper>
          <AdaptedCode className={className}>code</AdaptedCode>
        </CodeBlockWrapper>,
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
        <PreContext.Provider value={{}}>
          <AdaptedCode className="language-python">code</AdaptedCode>
        </PreContext.Provider>,
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
        <PreContext.Provider value={{}}>
          <AdaptedCode className="language-javascript">code</AdaptedCode>
        </PreContext.Provider>,
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
        <PreContext.Provider value={{}}>
          <AdaptedCode className="language-mermaid">code</AdaptedCode>
        </PreContext.Provider>,
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
        <CodeBlockWrapper>
          <AdaptedCode className="language-js">const x = 1;</AdaptedCode>
        </CodeBlockWrapper>,
      );

      expect(screen.getByTestId("syntax").textContent).toBe("const x = 1;");
    });

    it("extracts code from React element children", () => {
      const MockSyntax = vi.fn(({ code }) => (
        <div data-testid="syntax">{code}</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      // Simulates how streamdown might pass children
      const nestedElement = <span>nested code</span>;

      render(
        <CodeBlockWrapper>
          <AdaptedCode className="language-js">{nestedElement}</AdaptedCode>
        </CodeBlockWrapper>,
      );

      expect(MockSyntax).toHaveBeenCalled();
    });

    it("handles empty children", () => {
      const MockSyntax = vi.fn(({ code }) => (
        <div data-testid="syntax-empty">{code || "empty"}</div>
      ));
      const AdaptedCode = createCodeAdapter({
        SyntaxHighlighter: MockSyntax,
      });

      render(
        <CodeBlockWrapper>
          <AdaptedCode className="language-js">{""}</AdaptedCode>
        </CodeBlockWrapper>,
      );

      expect(screen.getByTestId("syntax-empty").textContent).toBe("empty");
    });
  });

  describe("null return for streamdown default", () => {
    it("returns null when no custom SyntaxHighlighter", () => {
      const AdaptedCode = createCodeAdapter({});

      const { container } = render(
        <CodeBlockWrapper>
          <AdaptedCode className="language-js">code</AdaptedCode>
        </CodeBlockWrapper>,
      );

      // When no SyntaxHighlighter provided for block code, returns null
      // React renders nothing for null
      expect(container.querySelector("code")).toBeNull();
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
        <CodeBlockWrapper>
          <AdaptedCode className="language-js">test</AdaptedCode>
        </CodeBlockWrapper>,
      );

      expect(screen.getByTestId("inner-code")).toBeDefined();
    });

    it("default Pre strips node prop", () => {
      const MockSyntax = vi.fn(({ components }) => {
        const { Pre } = components;
        // Pre should render a pre element and strip node
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
        <CodeBlockWrapper>
          <AdaptedCode className="language-js">test</AdaptedCode>
        </CodeBlockWrapper>,
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
        <CodeBlockWrapper>
          <AdaptedCode className="language-js">test</AdaptedCode>
        </CodeBlockWrapper>,
      );

      const codeElement = screen.getByTestId("code");
      expect(codeElement.tagName).toBe("CODE");
    });
  });
});
