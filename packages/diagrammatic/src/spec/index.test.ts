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

describe("size knobs", () => {
  it("carries width, height and fontSize through a typed spec", () => {
    const sized: ChartSpec = {
      type: "column",
      items: [{ label: "a", value: 3 }],
      width: 480,
      height: 200,
      fontSize: 13,
    };
    const html = renderToStaticMarkup(createElement(Chart, { spec: sized }));
    expect(html).toContain('width="480"');
    expect(html).toContain('height="200"');
    expect(html).toContain('viewBox="0 0 480 200"');
    expect(html).toContain('font-size="13"');
  });
});

describe("validateSpec", () => {
  it("accepts a well-formed spec and returns it typed", () => {
    expect(validateSpec(lineSpec)).toBe(lineSpec);
  });

  it("covers all 66 chart types", () => {
    expect(CHART_TYPES).toHaveLength(68);
  });

  it("rejects non-objects", () => {
    expect(() => validateSpec("line")).toThrow(/must be an object/);
  });

  it("rejects unknown types with the path", () => {
    expect(() => validateSpec({ type: "pyramid-3d" })).toThrow(
      /Unknown chart type at "type": pyramid-3d/,
    );
  });

  it.each(["constructor", "__proto__"])(
    "rejects inherited chart type %s with the path",
    (type) => {
      expect(() => validateSpec({ type })).toThrow(
        /Unknown chart type at "type":/,
      );
    },
  );

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

  it.each([
    [
      { type: "column", items: [null] },
      'Field "items[0]" for type "column" must be an object.',
    ],
    [
      { type: "column", items: [{ label: 1, value: 2 }] },
      'Field "items[0].label" for type "column" must be a string.',
    ],
    [
      { type: "column", items: [{ label: "a", value: Infinity }] },
      'Field "items[0].value" for type "column" must be a finite number.',
    ],
    [
      { type: "line", data: [null] },
      'Field "data[0]" for type "line" must be a finite number.',
    ],
    [
      { type: "line", series: [{ name: "a", data: [null] }] },
      'Field "series[0].data[0]" for type "line" must be a finite number.',
    ],
    [
      { type: "line", data: [1], series: [null] },
      'Field "series[0]" for type "line" must be an object.',
    ],
    [
      { type: "scatter", points: [null] },
      'Field "points[0]" for type "scatter" must be an object.',
    ],
    [
      { type: "connected-scatter", points: [], series: [null] },
      'Field "series[0]" for type "connected-scatter" must be an object.',
    ],
    [
      {
        type: "connected-scatter",
        series: [{ name: "a", points: [{ x: 1, y: "bad" }] }],
      },
      'Field "series[0].points[0].y" for type "connected-scatter" must be a finite number.',
    ],
    [
      { type: "sankey", graph: { nodes: [null], links: [] } },
      'Field "graph.nodes[0]" for type "sankey" must be an object.',
    ],
    [
      { type: "sankey", graph: { nodes: [], links: [{}] } },
      'Field "graph.links[0].source" for type "sankey" must be a string.',
    ],
    [
      { type: "mirrored-area", down: null, up: { name: "u", data: [1] } },
      'Field "down" for type "mirrored-area" must be an object.',
    ],
    [
      {
        type: "difference-area",
        actual: { name: "a" },
        reference: { name: "r", data: [1] },
      },
      'Field "actual.data" for type "difference-area" must be an array.',
    ],
    [
      {
        type: "heatmap",
        matrix: { rows: ["r"], cols: ["c"], values: [[null]] },
      },
      'Field "matrix.values[0][0]" for type "heatmap" must be a finite number.',
    ],
    [
      { type: "venn", a: { label: "a", value: 1 }, b: {}, overlap: 1 },
      'Field "b.label" for type "venn" must be a string.',
    ],
    [
      { type: "flow-map", origin: { col: 0 }, routes: [] },
      'Field "origin.row" for type "flow-map" must be a finite number.',
    ],
    [
      { type: "split-bar", a: { label: "a", value: 1 }, b: 2 },
      'Field "b" for type "split-bar" must be an object.',
    ],
    [
      { type: "horizon", series: [null] },
      'Field "series[0]" for type "horizon" must be an object.',
    ],
    [
      { type: "treemap", root: { label: "r", children: [{ label: 1 }] } },
      'Field "root.children[0].label" for type "treemap" must be a string.',
    ],
    [
      { type: "bullet", value: 5, target: 4, bands: [1, 2] },
      'Field "bands" for type "bullet" must be a tuple of 3 items.',
    ],
  ])("rejects malformed array entries with their path", (spec, message) => {
    expect(() => validateSpec(spec)).toThrow(message);
  });

  it("accepts connected scatter series without points", () => {
    const spec = {
      type: "connected-scatter",
      series: [{ name: "a", points: [{ x: 1, y: 2 }] }],
    };
    expect(validateSpec(spec)).toBe(spec);
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

  it("renders an inert placeholder for inherited chart types", () => {
    const html = renderToStaticMarkup(
      createElement(Chart, {
        spec: { type: "__proto__" } as unknown as ChartSpec,
      }),
    );
    expect(html).toContain("unknown chart type: __proto__");
    expect(html).toContain('role="img"');
  });

  it("uses the compact formatter for inherited unit names", () => {
    const inheritedUnitHtml = renderToStaticMarkup(
      createElement(Chart, {
        spec: {
          type: "line",
          data: [1000, 2000],
          unit: "__proto__",
        } as unknown as ChartSpec,
      }),
    );
    const compactUnitHtml = renderToStaticMarkup(
      createElement(Chart, {
        spec: { type: "line", data: [1000, 2000], unit: "compact" },
      }),
    );
    expect(inheritedUnitHtml).toBe(compactUnitHtml);
  });
});
