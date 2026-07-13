import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { MarkdownText } from "../MarkdownText";

describe("MarkdownText", () => {
  it("renders plain text", () => {
    const { lastFrame } = render(<MarkdownText text="Hello world" />);
    expect(lastFrame()).toContain("Hello world");
  });

  it("renders a heading with formatting", () => {
    const { lastFrame } = render(<MarkdownText text="# My Heading" />);
    const frame = lastFrame()!;
    expect(frame).not.toContain("# My Heading");
    expect(frame).toContain("My Heading");
  });

  it("renders bold text", () => {
    const { lastFrame } = render(<MarkdownText text="**bold text**" />);
    const frame = lastFrame()!;
    expect(frame).toContain("bold text");
    expect(frame).not.toContain("**");
  });

  it("renders a list", () => {
    const { lastFrame } = render(
      <MarkdownText text="- item one\n- item two" />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("item one");
    expect(frame).toContain("item two");
  });

  it("renders a code block", () => {
    const { lastFrame } = render(
      <MarkdownText text={'```js\nconsole.log("hello");\n```'} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('console.log("hello")');
  });

  it("renders inline code", () => {
    const { lastFrame } = render(
      <MarkdownText text="Use `const x = 1` here" />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("const x = 1");
    expect(frame).not.toMatch(/(?<![`])`(?![`])/);
  });

  it("accepts markdansi options", () => {
    const { lastFrame } = render(
      <MarkdownText text="- item" listIndent={4} theme="dim" />,
    );
    expect(lastFrame()).toContain("item");
  });

  it("updates as text grows", () => {
    const { lastFrame, rerender } = render(<MarkdownText text="Hello" />);
    expect(lastFrame()).toContain("Hello");

    rerender(<MarkdownText text="Hello world" />);
    expect(lastFrame()).toContain("Hello world");
  });

  it("re-renders when text changes", () => {
    const { lastFrame, rerender } = render(
      <MarkdownText text="# Title\n\nParagraph" />,
    );

    rerender(<MarkdownText text="# Title\n\nParagraph\n\nMore text" />);
    const frame = lastFrame()!;
    expect(frame).toContain("Title");
    expect(frame).toContain("More text");
  });

  it("passes highlighter to markdansi", () => {
    const highlighter = vi.fn((code: string) => `HIGHLIGHTED:${code}`);

    const { lastFrame } = render(
      <MarkdownText
        text={"```js\nconst x = 1;\n```"}
        highlighter={highlighter}
      />,
    );

    expect(highlighter).toHaveBeenCalled();
    expect(lastFrame()).toContain("HIGHLIGHTED:");
  });

  it("re-renders when highlighter changes without text changes", () => {
    const firstHighlighter = vi.fn((code: string) => `FIRST:${code}`);
    const secondHighlighter = vi.fn((code: string) => `SECOND:${code}`);

    const { lastFrame, rerender } = render(
      <MarkdownText
        text={"```js\nconst x = 1;\n```"}
        highlighter={firstHighlighter}
      />,
    );

    expect(lastFrame()).toContain("FIRST:");

    rerender(
      <MarkdownText
        text={"```js\nconst x = 1;\n```"}
        highlighter={secondHighlighter}
      />,
    );

    expect(lastFrame()).toContain("SECOND:");
    expect(lastFrame()).not.toContain("FIRST:");
  });

  it("forwards undeclared markdansi options", () => {
    const table =
      "| column |\n| --- |\n| a very long cell value that must truncate |";

    const { lastFrame } = render(
      <MarkdownText text={table} width={20} {...{ tableEllipsis: ">>>" }} />,
    );
    expect(lastFrame()).toContain(">>>");
  });

  it("re-wraps memoized output when the terminal is resized", async () => {
    const text = "word ".repeat(30).trim();

    const { lastFrame, stdout } = render(<MarkdownText text={text} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(lastFrame()!.trimEnd().split("\n").length).toBeGreaterThan(1);

    Object.defineProperty(stdout, "columns", {
      configurable: true,
      value: 200,
    });
    stdout.emit("resize");

    await vi.waitFor(() => {
      expect(lastFrame()!.trimEnd().split("\n")).toHaveLength(1);
    });
  });

  it("shares a single stdout resize listener across markdown instances", async () => {
    const single = render(<MarkdownText text="one" />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const baseline = single.stdout.listenerCount("resize");
    expect(baseline).toBeGreaterThanOrEqual(1);
    single.unmount();

    const texts = Array.from({ length: 12 }, (_, i) => `message ${i}`);
    const many = render(
      <>
        {texts.map((t) => (
          <MarkdownText key={t} text={t} />
        ))}
      </>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(many.stdout.listenerCount("resize")).toBe(baseline);
  });

  it("memoizes rendering across re-renders with unchanged props", () => {
    const highlighter = vi.fn((code: string) => code);
    const text = "```js\nconst x = 1;\n```";

    const { rerender } = render(
      <MarkdownText text={text} highlighter={highlighter} />,
    );
    expect(highlighter).toHaveBeenCalledTimes(1);

    rerender(<MarkdownText text={text} highlighter={highlighter} />);
    expect(highlighter).toHaveBeenCalledTimes(1);

    rerender(
      <MarkdownText
        text={"```js\nconst y = 2;\n```"}
        highlighter={highlighter}
      />,
    );
    expect(highlighter).toHaveBeenCalledTimes(2);

    rerender(
      <MarkdownText
        text={"```js\nconst y = 2;\n```"}
        highlighter={highlighter}
        codeGutter
      />,
    );
    expect(highlighter).toHaveBeenCalledTimes(3);
  });
});
