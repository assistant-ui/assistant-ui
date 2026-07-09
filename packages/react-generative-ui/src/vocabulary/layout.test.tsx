import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { layoutVocabulary } from "./layout";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, layoutVocabulary)}</>);

describe("layoutVocabulary", () => {
  it("Card renders a section with optional title and padding/background hooks", () => {
    expect(
      render({
        $type: "Card",
        title: "T",
        padding: 2,
        background: "muted",
      }),
    ).toBe(
      '<section data-aui="card" data-aui-padding="2" data-aui-background="muted"><header data-aui="card-title">T</header></section>',
    );
  });

  it("Card without a title omits the header", () => {
    expect(render({ $type: "Card" })).toBe(
      '<section data-aui="card"></section>',
    );
  });

  it("Col renders a div with gap/align hooks and nested children", () => {
    expect(
      render({
        $type: "Col",
        gap: 2,
        align: "center",
        children: { $type: "Text", value: "x" } as never,
      }),
    ).toContain('data-aui="col"');
  });

  it("Row renders a div with gap/align/justify hooks", () => {
    const html = render({
      $type: "Row",
      gap: 4,
      align: "start",
      justify: "between",
    });
    expect(html).toBe(
      '<div data-aui="row" data-aui-gap="4" data-aui-align="start" data-aui-justify="between"></div>',
    );
  });

  it("Spacer renders an empty div", () => {
    expect(render({ $type: "Spacer" })).toBe('<div data-aui="spacer"></div>');
  });

  it("Badge renders a span with the value and variant hook", () => {
    expect(render({ $type: "Badge", value: "new", variant: "success" })).toBe(
      '<span data-aui="badge" data-aui-variant="success">new</span>',
    );
  });
});
