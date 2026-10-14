import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StackedBar } from "./stacked-bar";

const barHeight = (guides?: { at: number; axis?: "x" | "y" }[]) => {
  const html = renderToStaticMarkup(
    <StackedBar
      groups={["sales"]}
      series={[{ name: "sales", data: [20] }]}
      {...(guides ? { guides } : {})}
    />,
  );
  const height = /<rect[^>]*height="([^"]+)"[^>]*data-series="sales"/.exec(
    html,
  )?.[1];
  if (!height) throw new Error("Missing stacked bar segment");
  return Number(height);
};

describe("StackedBar guide axes", () => {
  it("keeps the value scale when an x guide is outside the group range", () => {
    expect(barHeight([{ at: 1000, axis: "x" }])).toBe(barHeight());
  });

  it("includes a default y guide in the value scale", () => {
    expect(barHeight([{ at: 1000 }])).not.toBe(barHeight());
  });
});
