import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolarArea } from "./polar-area";

const items = [
  { label: "north", value: 4 },
  { label: "south", value: 2 },
];
const innerRadius = (markup: string) => {
  const path = /<path\b[^>]*data-part="mark"[^>]*>/.exec(markup)?.[0] ?? "";
  const arcs = [...path.matchAll(/A([\d.]+) [\d.]+/g)];
  expect(arcs).toHaveLength(2);
  return { outer: Number(arcs[0]![1]), inner: Number(arcs[1]![1]) };
};

describe("PolarArea inner radius", () => {
  it("keeps the default markup when inner is omitted explicitly", () => {
    const defaultMarkup = renderToStaticMarkup(<PolarArea items={items} />);
    const omitted: { inner?: number } = {};
    expect(defaultMarkup).toBe(
      renderToStaticMarkup(<PolarArea items={items} {...omitted} />),
    );
    const { outer, inner } = innerRadius(defaultMarkup);
    expect(inner).toBeCloseTo(Math.max(2, outer * 0.12));
    expect(defaultMarkup).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("uses a clamped fraction of the outer radius for the hole", () => {
    const small = renderToStaticMarkup(<PolarArea items={items} inner={0.2} />);
    const large = renderToStaticMarkup(<PolarArea items={items} inner={0.5} />);
    const capped = renderToStaticMarkup(<PolarArea items={items} inner={2} />);
    const floor = renderToStaticMarkup(<PolarArea items={items} inner={-1} />);
    expect(innerRadius(large).inner).toBeGreaterThan(innerRadius(small).inner);
    expect(innerRadius(large).inner).toBeCloseTo(
      innerRadius(large).outer * 0.5,
    );
    expect(innerRadius(capped).inner).toBeCloseTo(
      innerRadius(capped).outer * 0.9,
    );
    expect(innerRadius(floor).inner).toBe(0);
    for (const html of [small, large, capped, floor])
      expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("treats a NaN fraction as omitted", () => {
    expect(
      renderToStaticMarkup(<PolarArea items={items} inner={Number.NaN} />),
    ).toBe(renderToStaticMarkup(<PolarArea items={items} />));
  });
});
