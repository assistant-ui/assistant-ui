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
      '<button type="button" data-aui="button" data-aui-style="primary" data-aui-block="true">Go</button>',
    );
  });

  it("Button omits data-aui-block when block is false or omitted", () => {
    expect(render({ $type: "Button", label: "Go", block: false })).toBe(
      '<button type="button" data-aui="button">Go</button>',
    );
  });

  it('Button renders type="button" by default and type="submit" with the submit prop', () => {
    expect(render({ $type: "Button", label: "Go" })).toContain('type="button"');
    const html = render({ $type: "Button", label: "Go", submit: true });
    expect(html).toContain('type="submit"');
    expect(html).toContain("data-aui-submit");
  });

  it("Button omits data-aui-submit when submit is false or omitted", () => {
    expect(
      render({ $type: "Button", label: "Go", submit: false }),
    ).not.toContain("data-aui-submit");
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

  it("Select renders a name attribute when provided", () => {
    const html = render({
      $type: "Select",
      name: "role",
      options: [{ label: "A", value: "a" }],
    });
    expect(html).toContain('name="role"');
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
      '<button type="button" data-aui="button">Go</button>',
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

  it("Input renders a name attribute when provided", () => {
    expect(render({ $type: "Input", name: "email" })).toContain('name="email"');
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

  it("DatePicker renders a name attribute when provided", () => {
    expect(render({ $type: "DatePicker", name: "dob" })).toContain(
      'name="dob"',
    );
  });

  it("Checkbox renders a label wrapping the input and a checkbox-label span", () => {
    const html = render({ $type: "Checkbox", label: "Accept terms" });
    expect(html).toContain('data-aui="checkbox"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-aui="checkbox-label"');
    expect(html).toContain("Accept terms");
  });

  it("Checkbox renders name and defaultChecked when provided", () => {
    const html = render({
      $type: "Checkbox",
      label: "Accept",
      name: "agree",
      defaultChecked: true,
    });
    expect(html).toContain('name="agree"');
    expect(html).toContain('checked=""');
  });

  it("RadioGroup renders a fieldset with one radio per option", () => {
    const html = render({
      $type: "RadioGroup",
      options: [
        { label: "Small", value: "sm" },
        { label: "Large", value: "lg" },
      ],
    });
    expect(html).toContain('data-aui="radiogroup"');
    expect((html.match(/type="radio"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-aui="radiogroup-option"');
    expect(html).toContain("Small");
    expect(html).toContain("Large");
  });

  it("RadioGroup renders an aria-label from the label prop", () => {
    const html = render({
      $type: "RadioGroup",
      label: "Size",
      options: [{ label: "Small", value: "sm" }],
    });
    expect(html).toContain('aria-label="Size"');
  });

  it("RadioGroup radios share the given name", () => {
    const html = render({
      $type: "RadioGroup",
      name: "size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Large", value: "lg" },
      ],
    });
    expect((html.match(/name="size"/g) ?? []).length).toBe(2);
  });

  it("RadioGroup falls back to a generated shared name when name is omitted", () => {
    const html = render({
      $type: "RadioGroup",
      options: [
        { label: "Small", value: "sm" },
        { label: "Large", value: "lg" },
      ],
    });
    const names = [...html.matchAll(/name="([^"]*)"/g)].map((m) => m[1]);
    expect(names.length).toBe(2);
    expect(names[0]).toBe(names[1]);
    expect(names[0]).toBeTruthy();
  });

  it("RadioGroup marks the option matching defaultValue as checked", () => {
    const html = render({
      $type: "RadioGroup",
      defaultValue: "lg",
      options: [
        { label: "Small", value: "sm" },
        { label: "Large", value: "lg" },
      ],
    });
    expect(html.match(/checked=""/g)?.length).toBe(1);
  });

  it("RadioGroup renders nothing for malformed entries without throwing", () => {
    expect(() =>
      render({
        $type: "RadioGroup",
        options: [
          { label: "Small", value: "sm" },
          null,
          { value: "no-label" },
          { label: "no-value" },
          "not-an-object",
        ],
      }),
    ).not.toThrow();
    const html = render({
      $type: "RadioGroup",
      options: [{ label: "Small", value: "sm" }, null],
    });
    expect((html.match(/type="radio"/g) ?? []).length).toBe(1);
  });

  it("RadioGroup with missing options renders an empty fieldset without throwing", () => {
    expect(() => render({ $type: "RadioGroup" })).not.toThrow();
    expect(render({ $type: "RadioGroup" })).toBe(
      '<fieldset data-aui="radiogroup"></fieldset>',
    );
  });
});
