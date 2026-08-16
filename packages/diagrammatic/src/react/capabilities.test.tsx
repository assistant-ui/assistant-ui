import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Bar } from "./charts/bar";
import { BoxPlot } from "./charts/box-plot";
import { Column } from "./charts/column";
import { Funnel } from "./charts/funnel";
import { Heatmap } from "./charts/heatmap";
import { Histogram } from "./charts/histogram";
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
