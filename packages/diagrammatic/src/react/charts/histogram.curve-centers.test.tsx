import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Histogram } from "./histogram";

const attrs = (tag: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    const key = m[1];
    const value = m[2];
    if (key !== undefined && value !== undefined) out[key] = value;
  }
  return out;
};

const pathAnchorXs = (d: string): number[] => {
  const xs: number[] = [];
  for (const part of d.split(/(?=[MLC])/)) {
    if (!part) continue;
    const cmd = part[0];
    const nums = part
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (cmd === "M" || cmd === "L") {
      if (nums[0] !== undefined) xs.push(nums[0]);
    } else if (cmd === "C" && nums.length >= 6) {
      const x = nums[4];
      if (x !== undefined) xs.push(x);
    }
  }
  return xs;
};

describe("Histogram smooth curve", () => {
  it("places curve anchors at bin centers", () => {
    const bins = [2, 6, 14, 30, 52, 74, 88, 92, 80, 60];
    const html = renderToStaticMarkup(
      <Histogram smooth bins={bins} width={400} height={240} />,
    );

    const hitRects = [...html.matchAll(/<rect\b[^>]*>/g)]
      .map((m) => attrs(m[0]))
      .filter((a) => a["data-part"] === "mark" && a.fill === "transparent");

    expect(hitRects.length).toBe(bins.length);
    const barCenters = hitRects
      .map((a) => {
        const x = Number(a.x);
        const w = Number(a.width);
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(w)).toBe(true);
        return x + w / 2;
      })
      .sort((a, b) => a - b);

    const curvePath = [...html.matchAll(/<path\b[^>]*>/g)]
      .map((m) => attrs(m[0]))
      .find((a) => a["data-part"] === "mark" && a.fill === "none");
    const curveD = curvePath?.d;
    expect(curveD).toBeDefined();
    const curveXs = pathAnchorXs(curveD as string).sort((a, b) => a - b);

    expect(curveXs.length).toBe(bins.length);
    for (let i = 0; i < bins.length; i += 1) {
      expect(Math.abs(curveXs[i]! - barCenters[i]!)).toBeLessThanOrEqual(0.5);
    }
  });
});
