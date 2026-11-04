import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Waffle } from "./waffle";

const items = [
  { label: "spent", value: 52 },
  { label: "remaining", value: 33 },
  { label: "saved", value: 15 },
];
const cells = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*data-part="mark"[^>]*>`, "g")),
    ([tag]) => tag,
  );
const attr = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];

describe("Waffle hex mark", () => {
  it("keeps all 100 cell colors, labels, and order on a staggered hex grid", () => {
    const square = renderToStaticMarkup(
      <Waffle items={items} legend={false} />,
    );
    const hex = renderToStaticMarkup(
      <Waffle items={items} legend={false} mark="hex" />,
    );
    const rects = cells(square, "rect");
    const paths = cells(hex, "path");
    expect(rects).toHaveLength(100);
    expect(paths).toHaveLength(100);
    expect(cells(hex, "rect")).toHaveLength(0);
    expect(
      paths.map((tag) => [
        attr(tag, "fill"),
        attr(tag, "opacity"),
        attr(tag, "data-series"),
      ]),
    ).toEqual(
      rects.map((tag) => [
        attr(tag, "fill"),
        attr(tag, "opacity"),
        attr(tag, "data-series"),
      ]),
    );
    expect(
      paths.every((tag) => (attr(tag, "d")?.match(/L/g) ?? []).length === 5),
    ).toBe(true);
    const firstX = Number(/^M([\d.]+)/.exec(attr(paths[0]!, "d")!)?.[1]);
    const secondX = Number(/^M([\d.]+)/.exec(attr(paths[1]!, "d")!)?.[1]);
    const nextRowX = Number(/^M([\d.]+)/.exec(attr(paths[10]!, "d")!)?.[1]);
    expect(secondX).toBeGreaterThan(firstX);
    expect(nextRowX).toBeGreaterThan(firstX);
    expect(hex).not.toMatch(/NaN|Infinity|undefined/);
    expect(square).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("keeps the default square markup identical to an explicit square mark", () => {
    expect(renderToStaticMarkup(<Waffle items={items} />)).toBe(
      renderToStaticMarkup(<Waffle items={items} mark="square" />),
    );
  });
});
