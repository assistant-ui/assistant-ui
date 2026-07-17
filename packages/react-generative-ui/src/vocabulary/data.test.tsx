import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { dataVocabulary } from "./data";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, dataVocabulary)}</>);

describe("dataVocabulary", () => {
  it("Table renders columns and rows", () => {
    const html = render({
      $type: "Table",
      columns: [{ label: "Name" }, { label: "Age" }],
      rows: [
        ["Ada", 36],
        ["Bob", 24],
      ],
    });
    expect(html).toContain('data-aui="table"');
    expect(html).toContain('<th data-aui="table-col">Name</th>');
    expect(html).toContain('<th data-aui="table-col">Age</th>');
    expect(html).toContain("<td>Ada</td>");
    expect(html).toContain("<td>36</td>");
    expect(html).toContain("<td>Bob</td>");
    expect(html).toContain("<td>24</td>");
  });

  it("Table renders with only rows (no header)", () => {
    const html = render({ $type: "Table", rows: [["only"]] });
    expect(html).toContain('data-aui="table"');
    expect(html).not.toContain("<thead>");
    expect(html).toContain("<td>only</td>");
  });

  it("Markdown renders the value in a div", () => {
    expect(render({ $type: "Markdown", value: "# hi" })).toBe(
      '<div data-aui="markdown"># hi</div>',
    );
  });

  it("Markdown renders partial value while streaming", () => {
    expect(
      renderToStaticMarkup(
        <>
          {renderGenerativeUI(
            { $type: "Markdown", value: "partial" },
            dataVocabulary,
            { status: "streaming" },
          )}
        </>,
      ),
    ).toBe('<div data-aui="markdown">partial</div>');
  });

  it("Chart bar variant renders one rect per data point", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 1 }, { value: 2 }, { value: 3 }],
      color: "#f00",
    });
    expect(html).toContain('data-aui="chart"');
    expect(html).toContain('data-aui-variant="bar"');
    expect(html).toContain('data-aui-color="#f00"');
    expect((html.match(/<rect/g) ?? []).length).toBe(3);
    expect(html).not.toContain("<polyline");
    expect(html).not.toContain("data-aui-data");
  });

  it("Chart line variant renders a single polyline through all points", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      data: [{ value: 0 }, { value: 20 }, { value: 40 }],
    });
    expect((html.match(/<polyline/g) ?? []).length).toBe(1);
    expect(html).not.toContain("<rect");
    expect(html).toContain('points="0,40 50,20 100,0"');
  });

  it("Chart line variant with a single data point renders a circle, not a polyline", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      data: [{ value: 20 }],
    });
    expect(html).not.toContain("<polyline");
    expect((html.match(/<circle/g) ?? []).length).toBe(1);
    expect(html).toContain('cx="50"');
    expect(html).toContain('cy="0"');
    expect(html).toContain('r="2"');
  });

  it("Chart sparkline variant is structurally identical to line, differentiated by the variant attribute", () => {
    const html = render({
      $type: "Chart",
      variant: "sparkline",
      data: [{ value: 0 }, { value: 20 }, { value: 40 }],
    });
    expect((html.match(/<polyline/g) ?? []).length).toBe(1);
    expect(html).toContain('data-aui-variant="sparkline"');
    expect(html).toContain('points="0,40 50,20 100,0"');
  });

  it("Chart renders an aria-label describing the variant and point count", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 1 }, { value: 2 }],
    });
    expect(html).toContain('aria-label="bar chart with 2 data points"');
  });

  it("Chart with empty data renders an empty svg without throwing", () => {
    expect(() =>
      render({ $type: "Chart", variant: "bar", data: [] }),
    ).not.toThrow();
    const html = render({ $type: "Chart", variant: "line", data: [] });
    expect(html).toContain('data-aui="chart"');
    expect(html).not.toContain("<rect");
    expect(html).not.toContain("<polyline");
    expect(html).toContain('aria-label="line chart with 0 data points"');
  });

  it("Chart with missing data renders an empty svg without throwing", () => {
    expect(() => render({ $type: "Chart", variant: "bar" })).not.toThrow();
    const html = render({ $type: "Chart", variant: "bar" });
    expect(html).toContain('data-aui="chart"');
    expect(html).not.toContain("<rect");
  });

  it("Chart clamps negative and non-finite values to 0", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: -5 }, { value: Number.NaN }, { value: 10 }],
    });
    expect((html.match(/<rect/g) ?? []).length).toBe(3);
    expect(html).toContain('height="0"');
    expect(html).toContain('height="40"');
  });

  it("Chart with all-zero data renders flat baseline marks", () => {
    const barHtml = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 0 }, { value: 0 }],
    });
    expect((barHtml.match(/height="0"/g) ?? []).length).toBe(2);

    const lineHtml = render({
      $type: "Chart",
      variant: "line",
      data: [{ value: 0 }, { value: 0 }, { value: 0 }],
    });
    expect(lineHtml).toContain('points="0,40 50,40 100,40"');
  });
});

describe("dataVocabulary Chart multi-series", () => {
  it("wraps each series' marks in its own data-aui=chart-series group, indexed", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      series: [
        { label: "A", data: [{ value: 1 }, { value: 2 }] },
        { label: "B", data: [{ value: 3 }, { value: 4 }] },
        { label: "C", data: [{ value: 5 }, { value: 6 }] },
      ],
    });
    expect((html.match(/data-aui="chart-series"/g) ?? []).length).toBe(3);
    expect(html).toContain('data-aui-series="0"');
    expect(html).toContain('data-aui-series="1"');
    expect(html).toContain('data-aui-series="2"');
    expect((html.match(/<polyline/g) ?? []).length).toBe(3);
  });

  it("falls back to the data prop when series is an empty array", () => {
    const withEmptySeries = render({
      $type: "Chart",
      variant: "bar",
      series: [],
      data: [{ value: 1 }, { value: 2 }],
    });
    const withDataOnly = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 1 }, { value: 2 }],
    });
    expect((withEmptySeries.match(/<rect/g) ?? []).length).toBe(2);
    expect(withDataOnly).toContain('data-aui-variant="bar"');
  });

  it("series takes precedence over data when both are present", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 999 }],
      series: [{ data: [{ value: 1 }, { value: 2 }] }],
    });
    expect((html.match(/<rect/g) ?? []).length).toBe(2);
  });

  it("pads a shorter series with 0-valued points instead of throwing or misaligning", () => {
    expect(() =>
      render({
        $type: "Chart",
        variant: "bar",
        series: [
          { data: [{ value: 10 }, { value: 20 }, { value: 30 }] },
          { data: [{ value: 5 }] },
        ],
      }),
    ).not.toThrow();
    const html = render({
      $type: "Chart",
      variant: "bar",
      series: [
        { data: [{ value: 10 }, { value: 20 }, { value: 30 }] },
        { data: [{ value: 5 }] },
      ],
    });
    expect((html.match(/<rect/g) ?? []).length).toBe(6);
    expect(html).toContain('aria-label="bar chart with 3 data points"');
  });

  it("treats a missing series data array as empty rather than throwing", () => {
    expect(() =>
      render({
        $type: "Chart",
        variant: "bar",
        series: [{ label: "A" }, { data: [{ value: 1 }] }] as never,
      }),
    ).not.toThrow();
  });
});

describe("dataVocabulary Chart stacking", () => {
  it("stacked bars accumulate per x across series (known input)", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      stacked: true,
      series: [
        { data: [{ value: 10 }] },
        { data: [{ value: 20 }] },
        { data: [{ value: 30 }] },
      ],
    });
    // total at the single x is 60 -> scaleMax (unstacked axis, plain max) = 60.
    // series 0: height (10/60)*40 ≈ 6.667 at y = 40 - 0 - 6.667 ≈ 33.333
    // series 1: height (20/60)*40 ≈ 13.333 at y = 40 - 6.667 - 13.333 ≈ 20
    // series 2: height (30/60)*40 = 20 at y = 40 - 20 - 20 = 0
    expect(html).toContain('y="33.333333333333336"');
    expect(html).toContain('height="6.666666666666666"');
    expect(html).toContain('y="20.000000000000004"');
    expect(html).toContain('height="13.333333333333332"');
    expect(html).toContain('y="0" width="80" height="20"');
  });

  it("unstacked (overlaid) bars all start from the baseline regardless of series order", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      series: [{ data: [{ value: 10 }] }, { data: [{ value: 20 }] }],
    });
    expect((html.match(/y="0"/g) ?? []).length).toBe(1); // only the tallest bar touches y=0
  });

  it("stacked areas build cumulative top/bottom polygons per series", () => {
    const html = render({
      $type: "Chart",
      variant: "area",
      stacked: true,
      series: [
        { data: [{ value: 10 }, { value: 10 }] },
        { data: [{ value: 10 }, { value: 10 }] },
      ],
    });
    expect((html.match(/<polygon/g) ?? []).length).toBe(2);
    // series 0 (bottom band): top=10/20*40=20 -> y=20, bottom=0 -> y=40
    expect(html).toContain('points="0,20 100,20 100,40 0,40"');
    // series 1 (top band): top=20/20*40=40 -> y=0, bottom=10/20*40=20 -> y=20
    expect(html).toContain('points="0,0 100,0 100,20 0,20"');
  });

  it("stacked bars with showAxis keep the bottom segment on the baseline, abut exactly, and share one denominator with the ticks (totals crossing a tick boundary)", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      stacked: true,
      showAxis: true,
      series: [
        { data: [{ value: 50 }] },
        { data: [{ value: 30 }] },
        { data: [{ value: 25 }] },
      ],
    });
    // total 105 crosses the 50*10^n boundary, so niceMax must fall back to the
    // next power of ten (200) instead of resolving to an under-sized 100.
    expect(html).toContain("<div>200</div><div>150</div>");
    expect(html).toContain("<div>100</div><div>50</div><div>0</div>");

    // series 0 (bottom): height=(50/200)*40=10 at y=40-0-10=30; bottom edge
    // y+height=40, the chart baseline.
    expect(html).toContain('y="30" width="80" height="10"');
    // series 1: height=(30/200)*40=6 at y=40-10-6=24; abuts series 0's y=30
    // exactly (24+6=30, no gap or overlap).
    expect(html).toContain('y="24" width="80" height="6"');
    // series 2 (top): height=(25/200)*40=5 at y=40-16-5=19; abuts series 1's
    // y=24 exactly (19+5=24). The stack top (y=19) equals
    // 40-(105/200)*40=19, the same denominator (200) the ticks above use.
    expect(html).toContain('y="19" width="80" height="5"');
  });

  it("stacked areas keep the bottom band's baseline at the chart bottom regardless of scale", () => {
    const html = render({
      $type: "Chart",
      variant: "area",
      stacked: true,
      showAxis: true,
      series: [
        { data: [{ value: 60 }, { value: 60 }] },
        { data: [{ value: 60 }, { value: 60 }] },
      ],
    });
    // total 120 crosses the same tick boundary (niceMax -> 200); the bottom
    // band's own bottom edge must still sit at the chart baseline (y=40)
    // regardless of scale, since it is built from an all-zero `bottoms` array.
    expect(html).toContain("<div>200</div>");
    expect(html).toContain('points="0,28 100,28 100,40 0,40"');
  });
});

describe("dataVocabulary Chart area variant", () => {
  it("renders a closed filled polygon with fill-opacity and a stroke on top", () => {
    const html = render({
      $type: "Chart",
      variant: "area",
      data: [{ value: 0 }, { value: 40 }],
    });
    expect(html).toContain("<polygon");
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain('fill-opacity="0.25"');
    expect(html).toContain('stroke="currentColor"');
    // top line 0,40 -> 100,0 then closed back down to the baseline in reverse.
    expect(html).toContain('points="0,40 100,0 100,40 0,40"');
  });

  it("renders a circle instead of a degenerate polygon for a single point", () => {
    const html = render({
      $type: "Chart",
      variant: "area",
      data: [{ value: 20 }],
    });
    expect(html).not.toContain("<polygon");
    expect((html.match(/<circle/g) ?? []).length).toBe(1);
  });

  it("renders an empty series group without throwing when data is empty", () => {
    expect(() =>
      render({ $type: "Chart", variant: "area", data: [] }),
    ).not.toThrow();
    const html = render({ $type: "Chart", variant: "area", data: [] });
    expect(html).not.toContain("<polygon");
    expect(html).not.toContain("<circle");
  });
});

describe("dataVocabulary Chart showAxis niceMax ticks", () => {
  it("derives a round niceMax and renders 5 ticks from it down to 0", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      showAxis: true,
      data: [{ value: 42 }],
    });
    // niceMax(42): exponent=1, candidates 10,20,50 -> 50 is the first >= 42.
    expect(html).toContain('data-aui="chart-frame"');
    expect(html).toContain('data-aui="chart-ticks"');
    const ticksMatch = html.match(
      /<div data-aui="chart-ticks">(.*?)<\/div><svg/,
    );
    expect(ticksMatch).not.toBeNull();
    const ticksHtml = ticksMatch![1]!;
    expect((ticksHtml.match(/<div>/g) ?? []).length).toBe(5);
    expect(ticksHtml).toContain("<div>50</div>");
    expect(ticksHtml).toContain("<div>37.5</div>");
    expect(ticksHtml).toContain("<div>25</div>");
    expect(ticksHtml).toContain("<div>12.5</div>");
    expect(ticksHtml).toContain("<div>0</div>");
  });

  it("scales marks against niceMax (not the raw max) when the axis is shown", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      showAxis: true,
      data: [{ value: 42 }],
    });
    // niceMax = 50, so height = (42/50)*40 = 33.6, not (42/42)*40 = 40.
    expect(html).toContain('height="33.6"');
  });

  it("stays a bare svg (no frame) when neither showAxis nor showLegend is set, even with new props", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      stacked: true,
      series: [{ data: [{ value: 1 }] }],
    });
    expect(html).not.toContain("chart-frame");
    expect(html.startsWith("<svg")).toBe(true);
  });
});

describe("dataVocabulary Chart legend and x-labels", () => {
  it("renders an x-label row from the first series' point labels", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      showAxis: true,
      data: [
        { label: "Mon", value: 1 },
        { label: "Tue", value: 2 },
      ],
    });
    expect(html).toContain('data-aui="chart-xlabels">');
    expect(html).toContain("<div>Mon</div>");
    expect(html).toContain("<div>Tue</div>");
  });

  it("omits the legend row when showLegend is not set", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      showAxis: true,
      series: [{ label: "A", data: [{ value: 1 }] }],
    });
    expect(html).not.toContain("chart-legend");
  });

  it("renders a legend item per series with an indexed swatch when showLegend is set", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      showLegend: true,
      series: [
        { label: "Revenue", data: [{ value: 1 }] },
        { label: "Cost", data: [{ value: 2 }] },
      ],
    });
    expect((html.match(/data-aui="chart-legend-item"/g) ?? []).length).toBe(2);
    expect(html).toContain(
      '<span data-aui="chart-legend-item" data-aui-series="0">',
    );
    expect(html).toContain(
      '<span data-aui="chart-legend-item" data-aui-series="1">',
    );
    expect(html).toContain("Revenue");
    expect(html).toContain("Cost");
    expect((html.match(/data-aui="chart-legend-swatch"/g) ?? []).length).toBe(
      2,
    );
  });

  it("falls back to a positional label when a series has no label", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      showLegend: true,
      series: [{ data: [{ value: 1 }] }],
    });
    expect(html).toContain("Series 1");
  });

  it("area series overlay from the baseline when not stacked", () => {
    const html = render({
      $type: "Chart",
      variant: "area",
      series: [
        { data: [{ value: 10 }, { value: 20 }] },
        { data: [{ value: 30 }, { value: 40 }] },
      ],
    });
    const points = [...html.matchAll(/points="([^"]+)"/g)].map((m) => m[1]!);
    expect(points).toHaveLength(2);
    for (const polygon of points) {
      expect(polygon).toContain("100,40");
      expect(polygon).not.toContain("-");
    }
    expect(points[1]).toContain("100,0");
  });

  it("area series accumulate when stacked", () => {
    const html = render({
      $type: "Chart",
      variant: "area",
      stacked: true,
      series: [
        { data: [{ value: 10 }, { value: 20 }] },
        { data: [{ value: 30 }, { value: 40 }] },
      ],
    });
    const points = [...html.matchAll(/points="([^"]+)"/g)].map((m) => m[1]!);
    expect(points).toHaveLength(2);
    expect(points[1]).toContain("100,0");
    expect(points[1]).not.toContain("100,40");
  });

  it("line charts ignore stacked for the scale", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      stacked: true,
      series: [{ data: [{ value: 100 }] }, { data: [{ value: 100 }] }],
    });
    expect((html.match(/cy="0"/g) ?? []).length).toBe(2);
  });

  it("cycles series colors past the palette size", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      showLegend: true,
      series: Array.from({ length: 6 }, (_, i) => ({
        label: `S${i + 1}`,
        data: [{ value: i + 1 }],
      })),
    });
    expect(html).toContain('<g data-aui="chart-series" data-aui-series="4">');
    expect(
      (html.match(/<g data-aui="chart-series" data-aui-series="0">/g) ?? [])
        .length,
    ).toBe(2);
    expect(
      (
        html.match(
          /<span data-aui="chart-legend-item" data-aui-series="0">/g,
        ) ?? []
      ).length,
    ).toBe(2);
  });

  it("legend without axis renders no ticks or x labels", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      showLegend: true,
      series: [{ label: "A", data: [{ value: 1, label: "Jan" }] }],
    });
    expect(html).toContain('data-aui="chart-legend"');
    expect(html).not.toContain('data-aui="chart-ticks"');
    expect(html).not.toContain('data-aui="chart-xlabels"');
  });

  it("axis renders ticks and x labels", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      showAxis: true,
      series: [{ label: "A", data: [{ value: 1, label: "Jan" }] }],
    });
    expect(html).toContain('data-aui="chart-ticks"');
    expect(html).toContain('data-aui="chart-xlabels"');
  });
});
