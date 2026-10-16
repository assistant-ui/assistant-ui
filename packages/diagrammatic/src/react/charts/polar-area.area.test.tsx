import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PolarArea } from "./polar-area";

describe("PolarArea sector areas", () => {
  it("makes sector area proportional to value", () => {
    const html = renderToStaticMarkup(
      <PolarArea
        items={[
          { label: "One", value: 1 },
          { label: "Four", value: 4 },
        ]}
      />,
    );
    const radii = [...html.matchAll(/<path\b[^>]*data-part="mark"[^>]*>/g)].map(
      ([tag]) => {
        const path = /\bd="([^"]*)"/.exec(tag)?.[1] ?? "";
        const arcs = [...path.matchAll(/A([\d.]+) [\d.]+/g)];
        expect(arcs).toHaveLength(2);
        return { outer: Number(arcs[0]![1]), inner: Number(arcs[1]![1]) };
      },
    );
    expect(radii).toHaveLength(2);

    const sliceAngle = Math.PI;
    const areas = radii.map(
      ({ outer, inner }) => (sliceAngle / 2) * (outer ** 2 - inner ** 2),
    );
    expect(areas[1]! / areas[0]!).toBeCloseTo(4, 2);
  });

  it("draws a negative value as an empty sector without NaN", () => {
    const html = renderToStaticMarkup(
      <PolarArea
        items={[
          { label: "Four", value: 4 },
          { label: "Minus one", value: -1 },
        ]}
      />,
    );
    expect(html).not.toContain("NaN");
  });
});
