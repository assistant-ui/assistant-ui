import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { StreamdownTextPrimitive } from "../primitives/StreamdownText";
import type {
  StreamdownTextComponents,
  SyntaxHighlighterProps,
  CodeHeaderProps,
} from "../types";

afterEach(cleanup);

describe("StreamdownTextPrimitive", () => {
  it("renders without a SmoothContextProvider", () => {
    expect(() =>
      render(
        <TextMessagePartProvider text="hello" isRunning>
          <StreamdownTextPrimitive />
        </TextMessagePartProvider>,
      ),
    ).not.toThrow();
  });

  it("updates streamdown controls when the message completes", async () => {
    const table = `| a | b |\n| - | - |\n| 1 | 2 |`;

    const { container, rerender } = render(
      <TextMessagePartProvider text={table} isRunning>
        <StreamdownTextPrimitive />
      </TextMessagePartProvider>,
    );

    expect(
      container.querySelector("[data-status]")?.getAttribute("data-status"),
    ).toBe("running");
    expect(
      ((await screen.findByTitle("Copy table")) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      ((await screen.findByTitle("Download table")) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    rerender(
      <TextMessagePartProvider text={table} isRunning={false}>
        <StreamdownTextPrimitive />
      </TextMessagePartProvider>,
    );

    expect(
      container.querySelector("[data-status]")?.getAttribute("data-status"),
    ).toBe("complete");
    expect(
      ((await screen.findByTitle("Copy table")) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      ((await screen.findByTitle("Download table")) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  describe("code adapter with custom components", () => {
    const fencedMarkdown = "```ts\nconst x = 1;\n```";

    it("renders without throwing when SyntaxHighlighter is provided", () => {
      const SyntaxHighlighter = vi.fn(
        ({ code, language }: SyntaxHighlighterProps) => (
          <div data-testid="highlighter">{`${language}:${code}`}</div>
        ),
      );
      const components: StreamdownTextComponents = { SyntaxHighlighter };

      expect(() =>
        render(
          <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
            <StreamdownTextPrimitive components={components} />
          </TextMessagePartProvider>,
        ),
      ).not.toThrow();

      expect(SyntaxHighlighter).toHaveBeenCalled();
      const callArgs = SyntaxHighlighter.mock.calls[0]![0];
      expect(callArgs.language).toBe("ts");
      expect(callArgs.code.trim()).toBe("const x = 1;");
    });

    it("renders without throwing when only CodeHeader is provided", () => {
      const CodeHeader = vi.fn(({ language }: CodeHeaderProps) => (
        <div data-testid="header">{language}</div>
      ));
      const components: StreamdownTextComponents = { CodeHeader };

      const { container } = render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive components={components} />
        </TextMessagePartProvider>,
      );

      expect(CodeHeader).toHaveBeenCalled();
      expect(screen.getByTestId("header").textContent).toBe("ts");
      // Fallback must wrap <code> in <pre> so browsers preserve whitespace.
      expect(container.querySelector("pre > code")).not.toBeNull();
    });

    it("renders without throwing when componentsByLanguage is provided for an unmatched language", () => {
      const PythonHighlighter = vi.fn(() => (
        <div data-testid="python">python</div>
      ));

      const { container } = render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive
            componentsByLanguage={{
              python: { SyntaxHighlighter: PythonHighlighter },
            }}
          />
        </TextMessagePartProvider>,
      );

      // block is typescript, python config must be ignored and not invoked
      expect(PythonHighlighter).not.toHaveBeenCalled();
      expect(container.querySelector("pre > code")).not.toBeNull();
    });

    it("dispatches to language-specific SyntaxHighlighter", () => {
      const TsHighlighter = vi.fn(({ code }: SyntaxHighlighterProps) => (
        <div data-testid="ts-hl">{code}</div>
      ));
      const FallbackHighlighter = vi.fn(() => (
        <div data-testid="fallback-hl">fallback</div>
      ));

      render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive
            components={{ SyntaxHighlighter: FallbackHighlighter }}
            componentsByLanguage={{
              ts: { SyntaxHighlighter: TsHighlighter },
            }}
          />
        </TextMessagePartProvider>,
      );

      expect(TsHighlighter).toHaveBeenCalled();
      expect(FallbackHighlighter).not.toHaveBeenCalled();
      expect(screen.getByTestId("ts-hl").textContent?.trim()).toBe(
        "const x = 1;",
      );
    });
  });
});
