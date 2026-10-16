import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Quadrant } from "./quadrant";

function attribute(tag: string, name: string): number {
  const match = new RegExp(`${name}="([^"]+)"`).exec(tag);
  expect(match).not.toBeNull();
  const value = Number(match![1]);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

describe("Quadrant constant values", () => {
  it("centers marks and split lines when both dimensions are constant", () => {
    const html = renderToStaticMarkup(
      <Quadrant
        points={[{ x: 12, y: -8 }]}
        xLabel="x"
        yLabel="y"
        cutX={12}
        cutY={-8}
      />,
    );
    const plot = /<rect[^>]*data-part="grid"[^>]*>/.exec(html);
    const lines = [...html.matchAll(/<line[^>]*data-part="grid"[^>]*>/g)];
    const mark = /<circle[^>]*data-part="mark"[^>]*>/.exec(html);
    expect(plot).not.toBeNull();
    expect(lines).toHaveLength(2);
    expect(mark).not.toBeNull();
    const centerX = attribute(plot![0], "x") + attribute(plot![0], "width") / 2;
    const centerY =
      attribute(plot![0], "y") + attribute(plot![0], "height") / 2;
    expect(attribute(mark![0], "cx")).toBeCloseTo(centerX, 2);
    expect(attribute(mark![0], "cy")).toBeCloseTo(centerY, 2);
    expect(attribute(lines[0]![0], "x1")).toBeCloseTo(centerX, 2);
    expect(attribute(lines[1]![0], "y1")).toBeCloseTo(centerY, 2);
  });
});
