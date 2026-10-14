import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart, type ChartSpec } from "./index";

const y1 = (tag: string) => {
  const value = /\by1="([^"]+)"/.exec(tag)?.[1];
  expect(value).toBeDefined();
  return Number(value);
};

describe("Chart normalized stacked bar", () => {
  it("renders percent-point ticks and positions a 50% guide halfway up", () => {
    const spec: ChartSpec = {
      type: "stacked-bar",
      normalize: true,
      unit: "percent",
      groups: ["A"],
      series: [{ name: "value", data: [40] }],
      yTicks: 4,
      guides: [{ at: 50, label: "half" }],
    };
    const html = renderToStaticMarkup(<Chart spec={spec} />);
    const topGrid = [...html.matchAll(/<g data-part="grid">(.*?)<\/g>/g)].find(
      ([, body]) => body?.includes(">100%</text>"),
    )?.[1];
    expect(topGrid).toBeDefined();

    const bar = /<rect[^>]*data-series="value"[^>]*>/.exec(html)?.[0];
    expect(bar).toBeDefined();
    const top = Number(/\by="([^"]+)"/.exec(bar!)?.[1]);
    const bottom = top + Number(/\bheight="([^"]+)"/.exec(bar!)?.[1]);
    expect(y1(topGrid!)).toBeCloseTo(top, 1);

    const guide = /<g data-part="guide" data-series="half">(<line[^>]*>)/.exec(
      html,
    )?.[1];
    expect(guide).toBeDefined();
    expect(y1(guide!)).toBeCloseTo((top + bottom) / 2, 1);
  });
});
