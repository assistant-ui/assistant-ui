import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StripPlot } from "./strip-plot";

describe("StripPlot duplicates", () => {
  it("separates twelve identical observations by at least their diameter", () => {
    const html = renderToStaticMarkup(
      <StripPlot rows={[{ label: "same", values: Array(12).fill(5) }]} />,
    );
    const points = [...html.matchAll(/<circle\b[^>]*>/g)].map(([tag]) => ({
      x: Number(/\bcx="([^"]+)"/.exec(tag)?.[1]),
      y: Number(/\bcy="([^"]+)"/.exec(tag)?.[1]),
    }));
    expect(points).toHaveLength(12);
    expect(new Set(points.map(({ x, y }) => `${x},${y}`)).size).toBe(12);
    for (let i = 1; i < points.length; i += 1) {
      expect(
        Math.hypot(
          points[i]!.x - points[i - 1]!.x,
          points[i]!.y - points[i - 1]!.y,
        ),
      ).toBeGreaterThanOrEqual(6);
    }
    expect(
      renderToStaticMarkup(
        <StripPlot rows={[{ label: "same", values: Array(12).fill(5) }]} />,
      ),
    ).toBe(html);
  });
});
