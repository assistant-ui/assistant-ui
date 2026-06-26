import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { textVocabulary } from "./text";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, textVocabulary)}</>);

describe("textVocabulary", () => {
  it("Header renders an h2 with the text and a size hook", () => {
    expect(render({ $type: "Header", text: "Title", size: "xl" })).toBe(
      '<h2 data-aui="header" data-aui-size="xl">Title</h2>',
    );
  });

  it("Header defaults size to lg when omitted", () => {
    expect(render({ $type: "Header", text: "Title" })).toBe(
      '<h2 data-aui="header" data-aui-size="lg">Title</h2>',
    );
  });

  it("Text renders a span with size/weight/color hooks and the value", () => {
    expect(
      render({
        $type: "Text",
        value: "hi",
        size: "sm",
        weight: "bold",
        color: "secondary",
      }),
    ).toBe(
      '<span data-aui="text" data-aui-size="sm" data-aui-weight="bold" data-aui-color="secondary">hi</span>',
    );
  });

  it("Text defaults size to md and leaves weight/color undefined", () => {
    expect(render({ $type: "Text", value: "hi" })).toBe(
      '<span data-aui="text" data-aui-size="md">hi</span>',
    );
  });

  it("Text renders partial value while streaming (streamProperties: true)", () => {
    expect(
      renderToStaticMarkup(
        <>
          {renderGenerativeUI(
            { $type: "Text", value: "partial" },
            textVocabulary,
            { status: "streaming" },
          )}
        </>,
      ),
    ).toBe('<span data-aui="text" data-aui-size="md">partial</span>');
  });

  it("Text renders nested children (span-in-span, valid HTML)", () => {
    expect(
      render({
        $type: "Text",
        value: "before",
        children: { $type: "Text", value: "after" },
      }),
    ).toBe(
      '<span data-aui="text" data-aui-size="md">before<span data-aui="text" data-aui-size="md">after</span></span>',
    );
  });

  it("Caption renders a p with the value", () => {
    expect(render({ $type: "Caption", value: "muted note" })).toBe(
      '<p data-aui="caption">muted note</p>',
    );
  });
});
