import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RangeBar } from "./range-bar";

const barWidth = (guides?: { at: number; axis?: "x" | "y" }[]) => {
  const html = renderToStaticMarkup(
    <RangeBar
      items={[{ label: "sales", from: 10, to: 20 }]}
      {...(guides ? { guides } : {})}
    />,
  );
  const width =
    /<g data-part="mark" data-i="0">.*?<rect[^>]*width="([^"]+)"/.exec(
      html,
    )?.[1];
  if (!width) throw new Error("Missing range bar mark");
  return Number(width);
};

describe("RangeBar guide axes", () => {
  it("keeps the value scale when a y guide is outside the row range", () => {
    expect(barWidth([{ at: 1000, axis: "y" }])).toBe(barWidth());
  });

  it("includes a default x guide in the value scale", () => {
    expect(barWidth([{ at: 1000 }])).not.toBe(barWidth());
  });
});
