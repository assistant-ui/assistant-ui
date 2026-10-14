import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StripPlot } from "./strip-plot";

describe("StripPlot duplicates", () => {
  it("gives twelve identical observations distinct positions within the jitter bounds", () => {
    const html = renderToStaticMarkup(
      <StripPlot rows={[{ label: "same", values: Array(12).fill(5) }]} />,
    );
    const points = [...html.matchAll(/<circle\b[^>]*>/g)].map(([tag]) => ({
      x: Number(/\bcx="([^"]+)"/.exec(tag)?.[1]),
      y: Number(/\bcy="([^"]+)"/.exec(tag)?.[1]),
    }));
    const grid = /<line\b([^>]*)>/.exec(html)?.[1] ?? "";
    const gridX = Number(/\bx1="([^"]+)"/.exec(grid)?.[1]);
    const gridY = Number(/\by1="([^"]+)"/.exec(grid)?.[1]);
    expect(points).toHaveLength(12);
    expect(new Set(points.map(({ x, y }) => `${x},${y}`)).size).toBe(12);
    for (const { x, y } of points) {
      expect(x).toBeGreaterThanOrEqual(gridX - 1.5);
      expect(x).toBeLessThanOrEqual(gridX + 1.5);
      expect(y).toBeGreaterThanOrEqual(gridY - 4);
      expect(y).toBeLessThanOrEqual(gridY + 4);
    }
    expect(
      renderToStaticMarkup(
        <StripPlot rows={[{ label: "same", values: Array(12).fill(5) }]} />,
      ),
    ).toBe(html);
  });
});
