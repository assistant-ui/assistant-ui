import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StackedArea } from "./stacked-area";

const series = [{ name: "sales", data: [10, 20, 15] }];

const areaPath = (guides?: { at: number; axis?: "x" | "y" }[]) => {
  const html = renderToStaticMarkup(
    <StackedArea series={series} {...(guides ? { guides } : {})} />,
  );
  const path = /<path d="([^"]+)"[^>]*data-part="mark"/.exec(html)?.[1];
  if (!path) throw new Error("Missing stacked area mark");
  return path;
};

describe("StackedArea guide axes", () => {
  it("keeps the area scale when an x guide is outside the index range", () => {
    expect(areaPath([{ at: 1000, axis: "x" }])).toBe(areaPath());
  });

  it("includes a default y guide in the area scale", () => {
    expect(areaPath([{ at: 1000 }])).not.toBe(areaPath());
  });
});
