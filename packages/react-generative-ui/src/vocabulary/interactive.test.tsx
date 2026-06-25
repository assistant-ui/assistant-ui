import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { interactiveVocabulary } from "./interactive";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, interactiveVocabulary)}</>);

describe("interactiveVocabulary", () => {
  it("Button renders a button with style/block hooks and the label", () => {
    expect(
      render({
        $type: "Button",
        label: "Go",
        buttonStyle: "primary",
        block: true,
      }),
    ).toBe(
      '<button data-aui="button" data-aui-style="primary" data-aui-block="true">Go</button>',
    );
  });

  it("Button omits data-aui-block when block is false or omitted", () => {
    expect(render({ $type: "Button", label: "Go", block: false })).toBe(
      '<button data-aui="button">Go</button>',
    );
  });

  it("Select renders an aria-label when label is provided", () => {
    const html = render({
      $type: "Select",
      label: "Choose",
      options: [{ label: "A", value: "a" }],
    });
    expect(html).toContain('aria-label="Choose"');
  });

  it("Select keys options by index so duplicate values do not collide", () => {
    const html = render({
      $type: "Select",
      options: [
        { label: "A", value: "x" },
        { label: "B", value: "x" },
      ],
    });
    expect(html).toContain('<option value="x">A</option>');
    expect(html).toContain('<option value="x">B</option>');
  });

  it("Button stashes $action on a data-aui-action attribute", () => {
    const html = render({
      $type: "Button",
      label: "Buy",
      $action: { type: "purchase", itemId: "sku-1" },
    });
    expect(html).toContain('data-aui-action="');
    expect(html).toContain("&quot;type&quot;:&quot;purchase&quot;");
    expect(html).toContain("&quot;itemId&quot;:&quot;sku-1&quot;");
  });

  it("Button without $action omits the data-aui-action attribute", () => {
    expect(render({ $type: "Button", label: "Go" })).toBe(
      '<button data-aui="button">Go</button>',
    );
  });

  it("Select renders options with values and a placeholder", () => {
    const html = render({
      $type: "Select",
      placeholder: "Pick one",
      options: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
    });
    expect(html).toContain('data-aui="select"');
    expect(html).toContain(
      'value="" disabled="" selected="">Pick one</option>',
    );
    expect(html).toContain('<option value="a">A</option>');
    expect(html).toContain('<option value="b">B</option>');
  });

  it("Input renders a single-line input by default", () => {
    expect(render({ $type: "Input", placeholder: "type here" })).toBe(
      '<input data-aui="input" placeholder="type here"/>',
    );
  });

  it("Input multiline renders a textarea with the multiline hook", () => {
    const html = render({ $type: "Input", multiline: true });
    expect(html).toContain("data-aui-multiline");
    expect(html).toContain("<textarea");
  });

  it("DatePicker renders a date input with min/max", () => {
    const html = render({
      $type: "DatePicker",
      value: "2026-01-01",
      min: "2025-01-01",
      max: "2027-01-01",
    });
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2026-01-01"');
    expect(html).toContain('min="2025-01-01"');
    expect(html).toContain('max="2027-01-01"');
  });
});
