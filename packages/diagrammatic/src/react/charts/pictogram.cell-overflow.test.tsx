import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { frame } from "../svg";
import { Pictogram } from "./pictogram";

const cells = (html: string) =>
  [...html.matchAll(/<rect[^>]*>/g)].map(([tag]) => ({
    x: Number(/\bx="([^"]+)"/.exec(tag)?.[1]),
    y: Number(/\by="([^"]+)"/.exec(tag)?.[1]),
    width: Number(/\bwidth="([^"]+)"/.exec(tag)?.[1]),
    height: Number(/\bheight="([^"]+)"/.exec(tag)?.[1]),
  }));

describe("Pictogram cell overflow", () => {
  it("wraps 100 cells within the plot at width 320", () => {
    const html = renderToStaticMarkup(
      <Pictogram width={320} items={[{ label: "A", value: 100 }]} unit={1} />,
    );
    const rects = cells(html);
    const F = frame({ width: 320 }, 5 / 3, { labels: true, left: 22 });
    expect(rects).toHaveLength(100);
    expect(new Set(rects.map(({ y }) => y)).size).toBeGreaterThan(1);
    expect(rects[0]!.width).toBe(2);
    for (const { x, y, width, height } of rects) {
      expect(x).toBeGreaterThanOrEqual(F.left);
      expect(x + width).toBeLessThanOrEqual(F.right);
      expect(y).toBeGreaterThanOrEqual(F.top);
      expect(y + height).toBeLessThanOrEqual(F.bottom);
    }
  });

  it("shrinks cells when even wrapped rows cannot fit at the size floor", () => {
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
    expect(rects[0]!.width).toBeLessThan(2);
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
