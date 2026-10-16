import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MirroredArea } from "./mirrored-area";

const down = { name: "down", data: [10, 20, 15] };
const up = { name: "up", data: [5, 10, 8] };

const areaPath = (guides?: { at: number; axis?: "x" | "y" }[]) => {
  const html = renderToStaticMarkup(
    <MirroredArea down={down} up={up} {...(guides ? { guides } : {})} />,
  );
  const path = /<path d="([^"]+)"[^>]*data-series="down"/.exec(html)?.[1];
  if (!path) throw new Error("Missing mirrored area mark");
  return path;
};

describe("MirroredArea guide axes", () => {
  it("keeps the value scale when an x guide is outside the index range", () => {
    expect(areaPath([{ at: 1000, axis: "x" }])).toBe(areaPath());
  });

  it("includes a default y guide in the value scale", () => {
    expect(areaPath([{ at: 1000 }])).not.toBe(areaPath());
  });
});
