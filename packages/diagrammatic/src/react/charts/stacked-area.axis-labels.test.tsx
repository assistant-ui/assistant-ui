import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StackedArea } from "./stacked-area";

const labels = ["Jan", "Jun", "Dec"];

const axisLabels = (pointCount: number) => {
  const html = renderToStaticMarkup(
    <StackedArea
      series={[
        {
          name: "sales",
          data: Array.from({ length: pointCount }, (_, i) => i + 1),
        },
      ]}
      labels={labels}
      width={320}
    />,
  );
  const axis = /<g data-part="axis">([^]*?)<\/g>/.exec(html)?.[1] ?? "";
  return [...axis.matchAll(/<text x="([^"]+)"[^>]*>([^<]+)<\/text>/g)].map(
    ([, x, label]) => ({ x: Number(x), label }),
  );
};

describe("StackedArea axis labels", () => {
  it("spreads sparse labels across the full point span", () => {
    expect(axisLabels(12)).toEqual([
      { x: 21, label: "Jan" },
      { x: 160, label: "Jun" },
      { x: 299, label: "Dec" },
    ]);
  });

  it("keeps point positions when label and point counts match", () => {
    expect(axisLabels(3)).toEqual([
      { x: 21, label: "Jan" },
      { x: 160, label: "Jun" },
      { x: 299, label: "Dec" },
    ]);
  });
});
