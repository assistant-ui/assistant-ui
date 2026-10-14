import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Candlestick } from "./candlestick";

const data = [{ open: 120, high: 140, low: 110, close: 130 }];

const bodyY = (guides?: { at: number; axis?: "x" | "y" }[]) => {
  const html = renderToStaticMarkup(
    <Candlestick data={data} {...(guides ? { guides } : {})} />,
  );
  const y = /<g data-part="mark" data-i="0">.*?<rect[^>]* y="([^"]+)"/.exec(
    html,
  )?.[1];
  if (!y) throw new Error("Missing candlestick body");
  return Number(y);
};

describe("Candlestick guide axes", () => {
  it("keeps the price scale when an x guide is at index zero", () => {
    expect(bodyY([{ at: 0, axis: "x" }])).toBe(bodyY());
  });

  it("includes a default y guide in the price scale", () => {
    expect(bodyY([{ at: 0 }])).not.toBe(bodyY());
  });
});
