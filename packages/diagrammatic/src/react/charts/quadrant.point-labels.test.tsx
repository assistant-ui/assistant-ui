import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { textWidth } from "../../core/text";
import { Quadrant } from "./quadrant";

const attribute = (tag: string, name: string) =>
  Number(new RegExp(`${name}="([0-9.]+)"`).exec(tag)?.[1]);

describe("Quadrant point labels", () => {
  it("places a labeled point's text beside its mark inside the viewBox", () => {
    const html = renderToStaticMarkup(
      <Quadrant
        points={[
          { x: 0, y: 0 },
          { x: 5, y: 5, label: "Alpha" },
          { x: 10, y: 10 },
        ]}
        xLabel="x"
        yLabel="y"
      />,
    );
    const mark = /<circle\b[^>]*data-i="1"[^>]*>/.exec(html)?.[0];
    const label = /<text\b[^>]*>Alpha<\/text>/.exec(html)?.[0];
    const viewBox = /viewBox="([^"]+)"/.exec(html)?.[1]?.split(" ").map(Number);

    expect(mark).toBeDefined();
    expect(label).toBeDefined();
    expect(viewBox).toHaveLength(4);
    expect(
      Math.abs(attribute(label ?? "", "x") - attribute(mark ?? "", "cx")),
    ).toBeGreaterThanOrEqual(4);
    expect(
      Math.abs(attribute(label ?? "", "x") - attribute(mark ?? "", "cx")),
    ).toBeLessThanOrEqual(12);
    expect(
      Math.abs(attribute(label ?? "", "y") - attribute(mark ?? "", "cy")),
    ).toBeLessThan(12);
    expect(attribute(label ?? "", "x")).toBeGreaterThanOrEqual(
      viewBox?.[0] ?? NaN,
    );
    expect(attribute(label ?? "", "x")).toBeLessThanOrEqual(
      (viewBox?.[0] ?? NaN) + (viewBox?.[2] ?? NaN),
    );
    expect(attribute(label ?? "", "y")).toBeGreaterThanOrEqual(
      viewBox?.[1] ?? NaN,
    );
    expect(attribute(label ?? "", "y")).toBeLessThanOrEqual(
      (viewBox?.[1] ?? NaN) + (viewBox?.[3] ?? NaN),
    );
  });

  it("places and truncates a long label to the left of a point at the plot's right edge", () => {
    const html = renderToStaticMarkup(
      <Quadrant
        width={180}
        points={[
          { x: 0, y: 0 },
          {
            x: 10,
            y: 10,
            label: "edge-point-with-a-very-long-descriptive-label",
          },
        ]}
        xLabel="x"
        yLabel="y"
      />,
    );
    const mark = /<circle\b[^>]*data-i="1"[^>]*>/.exec(html)?.[0];
    const grid = /<rect\b[^>]*data-part="grid"[^>]*>/.exec(html)?.[0];
    const label = [...html.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].find(
      (match) => match[2]?.startsWith("edge-point"),
    );

    expect(mark).toBeDefined();
    expect(grid).toBeDefined();
    expect(label).toBeDefined();
    expect(label?.[1]).toContain('text-anchor="end"');
    expect(label?.[2]).toMatch(/…$/);
    expect(attribute(label?.[1] ?? "", "x")).toBeLessThan(
      attribute(mark ?? "", "cx"),
    );
    expect(
      attribute(label?.[1] ?? "", "x") - textWidth(label?.[2] ?? "", 11),
    ).toBeGreaterThanOrEqual(attribute(grid ?? "", "x"));
    expect(attribute(label?.[1] ?? "", "y")).toBeGreaterThanOrEqual(
      attribute(grid ?? "", "y") + 11,
    );
    expect(attribute(label?.[1] ?? "", "y")).toBeLessThanOrEqual(
      attribute(grid ?? "", "y") + attribute(grid ?? "", "height"),
    );
  });

  it("adds no point text when points have no labels", () => {
    const html = renderToStaticMarkup(
      <Quadrant
        points={[
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ]}
        xLabel="x"
        yLabel="y"
      />,
    );

    expect(html.match(/<text\b/g)).toHaveLength(1);
    expect(html.match(/<circle\b/g)).toHaveLength(2);
  });
});
