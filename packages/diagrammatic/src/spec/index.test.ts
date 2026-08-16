import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CHART_TYPES, Chart, validateSpec, type ChartSpec } from "./index";

const lineSpec: ChartSpec = {
  v: "dg/1",
  type: "line",
  title: "Monthly active users",
  labels: ["Jan", "Feb", "Mar"],
  data: [34, 46, 58],
};

describe("validateSpec", () => {
  it("accepts a well-formed spec and returns it typed", () => {
    expect(validateSpec(lineSpec)).toBe(lineSpec);
  });

  it("covers all 66 chart types", () => {
    expect(CHART_TYPES).toHaveLength(66);
  });

  it("rejects non-objects", () => {
    expect(() => validateSpec("line")).toThrow(/must be an object/);
  });

  it("rejects unknown types with the path", () => {
    expect(() => validateSpec({ type: "pyramid-3d" })).toThrow(
      /Unknown chart type at "type": pyramid-3d/,
    );
  });

  it("rejects unknown spec versions", () => {
    expect(() => validateSpec({ v: "dg/2", type: "line" })).toThrow(
      /Unknown spec version/,
    );
  });

  it("rejects missing required fields with type context", () => {
    expect(() => validateSpec({ type: "sankey" })).toThrow(
      /Missing required field "graph" for type "sankey"/,
    );
  });

  it("rejects wrong shapes", () => {
    expect(() => validateSpec({ type: "area", data: "1,2,3" })).toThrow(
      /"data" for type "area" must be an array/,
    );
  });
});

describe("Chart", () => {
  it("dispatches a spec to the matching component", () => {
    const html = renderToStaticMarkup(createElement(Chart, { spec: lineSpec }));
    expect(html).toContain("<svg");
    expect(html).toContain('aria-label="Monthly active users"');
    expect(html).toContain('data-part="mark"');
  });

  it("applies the percent unit to printed values", () => {
    const html = renderToStaticMarkup(
      createElement(Chart, {
        spec: { type: "line", data: [10, 20, 42.5], unit: "percent" },
      }),
    );
    expect(html).toContain("42.5%");
  });

  it("renders an inert placeholder for unknown types instead of throwing", () => {
    const html = renderToStaticMarkup(
      createElement(Chart, {
        spec: { type: "hologram" } as unknown as ChartSpec,
      }),
    );
    expect(html).toContain("unknown chart type: hologram");
    expect(html).toContain('role="img"');
  });
});
