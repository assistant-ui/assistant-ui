import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Scatter } from "./scatter";

function renderSizes(sizes: number[]) {
  const html = renderToStaticMarkup(
    <Scatter points={sizes.map((size, i) => ({ x: i, y: i * 2, size }))} />,
  );
  const radii = [...html.matchAll(/<circle\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /\bdata-part="mark"/.test(tag))
    .map((tag) => Number(/\br="([^"]*)"/.exec(tag)?.[1]));
  return { html, radii };
}

describe("Scatter negative sizes", () => {
  it("renders negative sizes like zero and preserves positive radii", () => {
    const { html, radii } = renderSizes([-9, 0, 1, 4]);
    expect(radii).toEqual([3, 3, 8.5, 14]);
    expect(html).not.toMatch(/\b[\w:-]+="NaN"/);
  });

  it("renders all-zero sizes at the minimum radius", () => {
    expect(renderSizes([0, 0]).radii).toEqual([3, 3]);
  });

  it("renders all-negative sizes at the minimum radius", () => {
    expect(renderSizes([-2, -8]).radii).toEqual([3, 3]);
  });
});
