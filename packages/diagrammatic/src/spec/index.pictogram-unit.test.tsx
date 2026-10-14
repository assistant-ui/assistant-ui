import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart, validateSpec } from "./index";

describe("Chart unit dispatch", () => {
  it("renders cells from a validated pictogram's numeric unit", () => {
    const spec = validateSpec({
      type: "pictogram",
      items: [
        { label: "A", value: 20 },
        { label: "B", value: 10 },
      ],
      unit: 10,
    });
    const html = renderToStaticMarkup(createElement(Chart, { spec }));

    expect(html.match(/<rect\b/g) ?? []).toHaveLength(4);
    expect(html).not.toContain("NaN");
  });

  it("formats a line spec with a string unit", () => {
    const spec = validateSpec({
      type: "line",
      data: [10, 42.5],
      unit: "percent",
    });
    const html = renderToStaticMarkup(createElement(Chart, { spec }));

    expect(html).toContain("42.5%");
  });
});
