import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Tile } from "../../core/tiles";
import { Chart, validateSpec } from "../../spec";
import { DotMap } from "./dot-map";

const tiles: Tile[] = [
  { col: 0, row: 0, x: 0, y: 0 },
  { col: 1, row: 0, x: 12, y: 0 },
];

function dots(html: string): number[] {
  const counts = [0, 0];
  for (const match of html.matchAll(
    /<circle\b[^>]*data-part="mark"[^>]*data-i="(\d+)"[^>]*>/g,
  )) {
    counts[Number(match[1])]! += 1;
  }
  return counts;
}

describe("DotMap dot budget", () => {
  it("uses the smallest nice shared unit that fits the budget", () => {
    const html = renderToStaticMarkup(
      <DotMap counts={[100, 50]} tiles={tiles} maxDots={20} />,
    );
    expect(dots(html)).toEqual([10, 5]);
    expect(
      dots(html).reduce((sum, count) => sum + count, 0),
    ).toBeLessThanOrEqual(20);
    expect(html).toContain("1 dot = 10");
  });

  it("keeps the ratio across tiles within one rounding step", () => {
    const html = renderToStaticMarkup(
      <DotMap counts={[103, 51]} tiles={tiles} maxDots={20} />,
    );
    const [first = 0, second = 0] = dots(html);
    expect(first + second).toBeLessThanOrEqual(20);
    expect(Math.abs(first - 2 * second)).toBeLessThanOrEqual(1);
  });

  it("keeps one dot for a small positive tile", () => {
    const html = renderToStaticMarkup(
      <DotMap counts={[1000, 1]} tiles={tiles} maxDots={20} />,
    );
    expect(dots(html)).toEqual([10, 1]);
    expect(html).toContain("1 dot = 100");
  });

  it("renders a unit noun in the legend, including when the unit is one", () => {
    const html = renderToStaticMarkup(
      <DotMap counts={[4, 2]} tiles={tiles} unit={2} unitLabel="users" />,
    );
    expect(dots(html)).toEqual([2, 1]);
    expect(html).toContain("1 dot = 2 users");

    const unitOne = renderToStaticMarkup(
      <DotMap counts={[2]} tiles={tiles} unitLabel="users" />,
    );
    expect(unitOne).toContain("1 dot = 1 users");
  });

  it("keeps one dot per counted unit when the total fits", () => {
    const html = renderToStaticMarkup(
      <DotMap counts={[2, 3]} tiles={tiles} maxDots={5} />,
    );
    expect(dots(html)).toEqual([2, 3]);
    expect(html).not.toContain('data-part="legend"');
  });

  it("uses a 200-dot budget by default", () => {
    const html = renderToStaticMarkup(
      <DotMap counts={[250, 100]} tiles={tiles} />,
    );
    expect(dots(html)).toEqual([125, 50]);
    expect(html).toContain("1 dot = 2");
  });

  it("passes the numeric unit through a dot-map spec", () => {
    const spec = validateSpec({
      type: "dot-map",
      counts: [4, 2],
      tiles,
      unit: 2,
      unitLabel: "users",
    });
    const html = renderToStaticMarkup(<Chart spec={spec} />);
    expect(dots(html)).toEqual([2, 1]);
    expect(html).toContain("1 dot = 2 users");
  });
});
