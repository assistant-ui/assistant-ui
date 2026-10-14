import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { frame } from "../svg";
import { Contour } from "./contour";

function majorAxis(html: string) {
  const mark = /<ellipse\b[^>]*>/.exec(html)?.[0] ?? "";
  const rx = Number(/\brx="([^"]+)"/.exec(mark)?.[1]);
  const ry = Number(/\bry="([^"]+)"/.exec(mark)?.[1]);
  const angle = Number(/\btransform="rotate\(([-\d.]+)/.exec(mark)?.[1]);
  expect(mark).not.toBe("");
  expect(rx).toBeGreaterThan(ry);
  return {
    x: Math.cos((angle * Math.PI) / 180),
    y: Math.sin((angle * Math.PI) / 180),
  };
}

describe("Contour orientation", () => {
  it("draws the major axis horizontally for an x-dominant projected cloud", () => {
    const html = renderToStaticMarkup(
      <Contour
        width={400}
        height={240}
        points={Array.from({ length: 21 }, (_, x) => ({
          x,
          y: x === 10 ? 1 : 0,
        }))}
      />,
    );
    const axis = majorAxis(html);
    expect(Math.abs(axis.x)).toBeGreaterThan(Math.abs(axis.y));
  });

  it("aligns the major axis with the screen projection of y = x", () => {
    const html = renderToStaticMarkup(
      <Contour
        width={400}
        height={240}
        points={[0, 1, 2, 3, 4].map((value) => ({ x: value, y: value }))}
      />,
    );
    const axis = majorAxis(html);
    const { left, right, top, bottom } = frame(
      { width: 400, height: 240 },
      5 / 3,
      { labels: false },
    );
    const dx = right - left;
    const dy = top - bottom;
    const deviation = Math.abs(dx * axis.y - dy * axis.x) / Math.hypot(dx, dy);
    expect(deviation).toBeLessThan(0.01);
  });

  it("keeps the center and radii of a cloud with spread on both axes", () => {
    const html = renderToStaticMarkup(
      <Contour
        width={400}
        height={240}
        points={[
          { x: 0, y: 10 },
          { x: 20, y: 10 },
          { x: 10, y: 0 },
          { x: 10, y: 20 },
          ...Array.from({ length: 47 }, () => ({ x: 10, y: 10 })),
        ]}
      />,
    );
    const mark = /<ellipse\b[^>]*>/.exec(html)?.[0] ?? "";
    const value = (name: string) =>
      Number(new RegExp(`\\b${name}="([^"]+)"`).exec(mark)?.[1]);
    const { left, right, top, bottom } = frame(
      { width: 400, height: 240 },
      5 / 3,
      { labels: false },
    );
    expect(value("cx")).toBeCloseTo((left + right) / 2, 1);
    expect(value("cy")).toBeCloseTo((top + bottom) / 2, 1);
    expect(value("rx")).toBeCloseTo(
      2.2 * Math.sqrt(2 / 51) * ((right - left) / 2),
      1,
    );
    expect(value("ry")).toBeCloseTo(
      2.2 * Math.sqrt(2 / 51) * ((bottom - top) / 2),
      1,
    );
  });
});
