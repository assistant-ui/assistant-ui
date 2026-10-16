import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Dumbbell } from "./dumbbell";

const items = [{ label: "sales", from: 10, to: 20 }];

const toX = (guides?: { at: number; axis?: "x" | "y" }[]) => {
  const html = renderToStaticMarkup(
    <Dumbbell items={items} {...(guides ? { guides } : {})} />,
  );
  const mark = /<g data-part="mark" data-i="0">(.*?)<\/g>/.exec(html)?.[1];
  const x = mark && [...mark.matchAll(/<circle cx="([^"]+)"/g)][1]?.[1];
  if (!x) throw new Error("Missing dumbbell endpoint");
  return Number(x);
};

describe("Dumbbell guide axes", () => {
  it("keeps the value scale when a y guide is outside the row range", () => {
    expect(toX([{ at: 1000, axis: "y" }])).toBe(toX());
  });

  it("includes a default x guide in the value scale", () => {
    expect(toX([{ at: 1000 }])).not.toBe(toX());
  });
});
