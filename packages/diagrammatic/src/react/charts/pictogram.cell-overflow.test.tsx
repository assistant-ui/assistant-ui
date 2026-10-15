import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { frame } from "../svg";
import * as pictogram from "./pictogram";
import { Pictogram } from "./pictogram";

const cells = (html: string) =>
  [...html.matchAll(/<rect[^>]*>/g)].map(([tag]) => ({
    x: Number(/\bx="([^"]+)"/.exec(tag)?.[1]),
    y: Number(/\by="([^"]+)"/.exec(tag)?.[1]),
    width: Number(/\bwidth="([^"]+)"/.exec(tag)?.[1]),
    height: Number(/\bheight="([^"]+)"/.exec(tag)?.[1]),
  }));

const largestCellSize = (count: number, plotW: number, rowH: number) =>
  Math.max(
    ...Array.from({ length: count }, (_, index) => {
      const columns = index + 1;
      const rows = Math.ceil(count / columns);
      return Math.min(
        20,
        rowH - 8,
        plotW / (columns + (columns - 1) * 0.2),
        rowH / (rows + (rows - 1) * 0.2),
      );
    }),
  );

describe("Pictogram cell overflow", () => {
  it("renders a zero unit without cells or non-finite markup", () => {
    const cellCount = Reflect.get(pictogram, "pictogramCellCount") as
      | ((value: number, unit: number) => number | null)
      | undefined;
    expect(cellCount?.(1, 0)).toBeNull();
    const html = renderToStaticMarkup(
      <Pictogram width={120} items={[{ label: "A", value: 1 }]} unit={0} />,
    );
    expect(cells(html)).toHaveLength(0);
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("draws positive-width cells for many items in a short chart", () => {
    const html = renderToStaticMarkup(
      <Pictogram
        width={90}
        height={120}
        items={Array.from({ length: 30 }, (_, index) => ({
          label: String(index),
          value: 20,
        }))}
        unit={1}
      />,
    );
    const rects = cells(html);
    expect(rects).toHaveLength(600);
    expect(rects.every(({ width }) => width > 0)).toBe(true);
  });

  it("wraps 100 cells within the plot at width 320", () => {
    const html = renderToStaticMarkup(
      <Pictogram width={320} items={[{ label: "A", value: 100 }]} unit={1} />,
    );
    const rects = cells(html);
    const F = frame({ width: 320 }, 5 / 3, { labels: true, left: 22 });
    expect(rects).toHaveLength(100);
    expect(new Set(rects.map(({ y }) => y)).size).toBeGreaterThan(1);
    expect(rects[0]!.width).toBeCloseTo(
      largestCellSize(100, F.right - F.left, F.bottom - F.top),
      1,
    );
    for (const { x, y, width, height } of rects) {
      expect(x).toBeGreaterThanOrEqual(F.left);
      expect(x + width).toBeLessThanOrEqual(F.right);
      expect(y).toBeGreaterThanOrEqual(F.top);
      expect(y + height).toBeLessThanOrEqual(F.bottom);
    }
  });

  it("fits 300 cells at the largest size allowed by a small plot", () => {
    const html = renderToStaticMarkup(
      <Pictogram
        width={120}
        height={120}
        items={[{ label: "A", value: 300 }]}
        unit={1}
      />,
    );
    const rects = cells(html);
    const F = frame({ width: 120, height: 120 }, 5 / 3, {
      labels: true,
      left: 22,
    });
    expect(rects).toHaveLength(300);
    expect(rects[0]!.width).toBeCloseTo(
      largestCellSize(300, F.right - F.left, F.bottom - F.top),
      1,
    );
    for (const { x, y, width, height } of rects) {
      expect(x).toBeGreaterThanOrEqual(F.left);
      expect(x + width).toBeLessThanOrEqual(F.right);
      expect(y).toBeGreaterThanOrEqual(F.top);
      expect(y + height).toBeLessThanOrEqual(F.bottom);
    }
  });

  it("keeps the original size and single row when cells fit", () => {
    const html = renderToStaticMarkup(
      <Pictogram width={320} items={[{ label: "A", value: 3 }]} unit={1} />,
    );
    const rects = cells(html);
    expect(rects).toHaveLength(3);
    expect(rects.map(({ x, width }) => [x, width])).toEqual([
      [22, 20],
      [46, 20],
      [70, 20],
    ]);
    expect(new Set(rects.map(({ y }) => y)).size).toBe(1);
  });
});
