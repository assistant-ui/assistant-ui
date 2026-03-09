import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { MarkdownText } from "../MarkdownText";

describe("MarkdownText", () => {
  describe("complete rendering", () => {
    it("renders plain text", () => {
      const { lastFrame } = render(
        <MarkdownText text="Hello world" status="complete" />,
      );
      expect(lastFrame()).toContain("Hello world");
    });

    it("renders a heading with formatting", () => {
      const { lastFrame } = render(
        <MarkdownText text="# My Heading" status="complete" />,
      );
      const frame = lastFrame()!;
      // markdansi renders headings with ANSI styling — should not be raw markdown
      expect(frame).not.toContain("# My Heading");
      expect(frame).toContain("My Heading");
    });

    it("renders bold text", () => {
      const { lastFrame } = render(
        <MarkdownText text="**bold text**" status="complete" />,
      );
      const frame = lastFrame()!;
      expect(frame).toContain("bold text");
      // Should not contain raw markdown delimiters
      expect(frame).not.toContain("**");
    });

    it("renders a list", () => {
      const { lastFrame } = render(
        <MarkdownText text="- item one\n- item two" status="complete" />,
      );
      const frame = lastFrame()!;
      expect(frame).toContain("item one");
      expect(frame).toContain("item two");
    });

    it("renders a code block", () => {
      const { lastFrame } = render(
        <MarkdownText
          text={'```js\nconsole.log("hello");\n```'}
          status="complete"
        />,
      );
      const frame = lastFrame()!;
      expect(frame).toContain('console.log("hello")');
    });

    it("renders inline code", () => {
      const { lastFrame } = render(
        <MarkdownText text="Use `const x = 1` here" status="complete" />,
      );
      const frame = lastFrame()!;
      expect(frame).toContain("const x = 1");
      // Raw backticks should not appear
      expect(frame).not.toMatch(/(?<![`])`(?![`])/);
    });

    it("accepts markdansi options", () => {
      const { lastFrame } = render(
        <MarkdownText
          text="- item"
          status="complete"
          listIndent={4}
          theme="monochrome"
        />,
      );
      expect(lastFrame()).toContain("item");
    });
  });

  describe("streaming rendering", () => {
    it("renders text while streaming", () => {
      const { lastFrame } = render(
        <MarkdownText text="Hello world" status="running" />,
      );
      expect(lastFrame()).toContain("Hello world");
    });

    it("updates as text grows during streaming", () => {
      const { lastFrame, rerender } = render(
        <MarkdownText text="Hello" status="running" />,
      );
      expect(lastFrame()).toContain("Hello");

      rerender(<MarkdownText text="Hello world" status="running" />);
      expect(lastFrame()).toContain("Hello world");
    });

    it("handles transition from running to complete", () => {
      const { lastFrame, rerender } = render(
        <MarkdownText text="# Title\n\nParagraph" status="running" />,
      );

      // Switch to complete — should re-render with full one-shot rendering
      rerender(<MarkdownText text="# Title\n\nParagraph" status="complete" />);
      const frame = lastFrame()!;
      expect(frame).toContain("Title");
      expect(frame).toContain("Paragraph");
    });
  });

  describe("with highlighter", () => {
    it("passes highlighter to markdansi", () => {
      const highlighter = vi.fn((code: string) => `HIGHLIGHTED:${code}`);

      const { lastFrame } = render(
        <MarkdownText
          text={"```js\nconst x = 1;\n```"}
          status="complete"
          highlighter={highlighter}
        />,
      );

      expect(highlighter).toHaveBeenCalled();
      expect(lastFrame()).toContain("HIGHLIGHTED:");
    });
  });

  describe("without status", () => {
    it("defaults to complete rendering when status is omitted", () => {
      const { lastFrame } = render(<MarkdownText text="**bold**" />);
      const frame = lastFrame()!;
      expect(frame).toContain("bold");
      expect(frame).not.toContain("**");
    });
  });
});
