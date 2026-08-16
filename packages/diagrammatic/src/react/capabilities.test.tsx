import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Bar } from "./charts/bar";
import { BoxPlot } from "./charts/box-plot";
import { Candlestick } from "./charts/candlestick";
import { Column } from "./charts/column";
import { Funnel } from "./charts/funnel";
import { Heatmap } from "./charts/heatmap";
import { Gantt } from "./charts/gantt";
import { Histogram } from "./charts/histogram";
import { Horizon } from "./charts/horizon";
import { Line } from "./charts/line";
import { Violin } from "./charts/violin";
import { Waterfall } from "./charts/waterfall";

describe("ceiling capabilities", () => {
  it("Line renders yTicks grid with labels", () => {
    const html = renderToStaticMarkup(
      <Line data={[1, 5, 3]} yTicks={[{ at: 4, label: "4x" }]} />,
    );
    expect(html).toContain(">4x</text>");
    expect(html).toContain('data-part="grid"');
  });

  it("Line prints named marks on a series", () => {
    const html = renderToStaticMarkup(
      <Line
        series={[{ name: "baseline", data: [10, 20, 30] }]}
        marks={[{ series: "baseline", at: 2, label: "30 tok" }]}
      />,
    );
    expect(html).toContain(">30 tok</text>");
  });

  it("Line figure density stamps the frame and uses the figure type scale", () => {
    const html = renderToStaticMarkup(
      <Line density="figure" data={[1, 2, 3]} labels={["a", "b", "c"]} />,
    );
    expect(html).toContain('data-density="figure"');
    expect(html).toContain('font-size="3.6"');
  });

  it("Gantt keeps a usable bar height on a ten-row figure", () => {
    const html = renderToStaticMarkup(
      <Gantt
        density="figure"
        aspect={1.9}
        today={50}
        labels={["Apr", "Jul"]}
        rows={Array.from({ length: 10 }, (_, i) => ({
          label: `r${i}`,
          from: i,
          to: i + 8,
        }))}
      />,
    );
    const heights = [...html.matchAll(/<rect[^>]*height="([^"]+)"/g)].map((m) =>
      Number(m[1]),
    );
    expect(heights.length).toBe(10);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(2.4);
    expect(html).toContain('dominant-baseline="central"');
  });

  it("Line y-tick rules are dashed", () => {
    const html = renderToStaticMarkup(
      <Line data={[1, 5, 3]} yTicks={[{ at: 4, label: "4x" }]} />,
    );
    expect(html).toContain('stroke-dasharray="1.8 2.4"');
    expect(html).toContain(">4x</text>");
  });

  it("Candlestick yTicks own the value axis", () => {
    const html = renderToStaticMarkup(
      <Candlestick
        data={[{ open: 10, close: 12, low: 8, high: 20 }]}
        yTicks={[
          { at: 10, label: "10" },
          { at: 20, label: "20" },
        ]}
      />,
    );
    expect(html).toContain(">10</text>");
    expect(html).toContain(">20</text>");
    expect(html).not.toContain(">8</text>");
  });

  it("Column figure density stamps the frame and uses the figure type scale", () => {
    const html = renderToStaticMarkup(
      <Column
        density="figure"
        items={[{ label: "a", value: 10 }]}
        yTicks={[{ at: 10, label: "10" }]}
      />,
    );
    expect(html).toContain('data-density="figure"');
    expect(html).toContain('font-size="3.6"');
    expect(html).toContain('stroke-dasharray="1.8 2.4"');
  });

  it("Bar figure density keeps row labels on the midline", () => {
    const html = renderToStaticMarkup(
      <Bar
        density="figure"
        items={[
          { label: "alpha", value: 10 },
          { label: "beta", value: 6 },
        ]}
      />,
    );
    expect(html).toContain('data-density="figure"');
    expect(html).toContain('dominant-baseline="central"');
  });

  it("Horizon stacks named series as separate bands", () => {
    const html = renderToStaticMarkup(
      <Horizon
        series={[
          { name: "api-1a", data: [1, 3, 2] },
          { name: "api-1b", data: [2, 4, 1] },
        ]}
      />,
    );
    expect(html).toContain(">api-1a</text>");
    expect(html).toContain(">api-1b</text>");
    expect(html.split('data-part="mark"').length).toBeGreaterThan(2);
  });

  it("Column renders a labeled target line inside the domain", () => {
    const html = renderToStaticMarkup(
      <Column
        items={[{ label: "a", value: 10 }]}
        target={{ at: 14, label: "goal" }}
      />,
    );
    expect(html).toContain(">goal</text>");
    expect(html).toContain("stroke-dasharray");
  });

  it("Bar renders xTicks for its horizontal value axis", () => {
    const html = renderToStaticMarkup(
      <Bar
        items={[{ label: "a", value: 10 }]}
        xTicks={[{ at: 5, label: "5" }]}
      />,
    );
    expect(html).toContain(">5</text>");
  });

  it("Histogram overlays a dashed compare distribution", () => {
    const html = renderToStaticMarkup(
      <Histogram bins={[2, 6, 3]} compare={[3, 5, 2]} />,
    );
    expect(html).toContain('stroke-dasharray="3 2"');
  });

  it("Waterfall draws bridge connectors between steps", () => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[
          { label: "start", value: 10, total: true },
          { label: "up", value: 4 },
          { label: "end", value: 14, total: true },
        ]}
      />,
    );
    expect(html).toContain('stroke-dasharray="1.5 2"');
  });

  it("Funnel prints between-stage conversion rates", () => {
    const html = renderToStaticMarkup(
      <Funnel
        rates
        items={[
          { label: "a", value: 100 },
          { label: "b", value: 60 },
        ]}
      />,
    );
    expect(html).toContain(">60%</text>");
  });

  it("Heatmap prints values only on dark cells", () => {
    const html = renderToStaticMarkup(
      <Heatmap
        values
        matrix={{
          rows: ["r"],
          cols: ["a", "b"],
          values: [[10, 1]],
        }}
      />,
    );
    expect(html).toContain(">10</text>");
    expect(html).not.toContain(">1</text>");
  });

  it("Violin keeps raw points inside the shape span", () => {
    const html = renderToStaticMarkup(
      <Violin
        categorical
        groups={[
          {
            label: "g",
            widths: [2, 8, 2],
            median: 0.5,
            points: [10, 20, 30],
          },
        ]}
      />,
    );
    expect((html.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain("NaN");
  });

  it("BoxPlot jitters raw points deterministically", () => {
    const a = renderToStaticMarkup(
      <BoxPlot
        groups={[
          {
            label: "g",
            low: 1,
            q1: 2,
            median: 3,
            q3: 4,
            high: 5,
            points: [1, 3, 5],
          },
        ]}
      />,
    );
    const b = renderToStaticMarkup(
      <BoxPlot
        groups={[
          {
            label: "g",
            low: 1,
            q1: 2,
            median: 3,
            q3: 4,
            high: 5,
            points: [1, 3, 5],
          },
        ]}
      />,
    );
    expect(a).toBe(b);
  });
});
