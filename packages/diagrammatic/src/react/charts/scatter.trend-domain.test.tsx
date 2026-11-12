import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Scatter } from "./scatter";

const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );
const attr = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];

describe("Scatter trend domain", () => {
  it("keeps a trend that overshoots the points inside the value axis", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 10 },
      { x: 2, y: 10 },
    ];
    const top = (markup: string) =>
      Math.min(...tags(markup, "circle").map((tag) => Number(attr(tag, "cy"))));
    const plain = renderToStaticMarkup(<Scatter points={points} />);
    const html = renderToStaticMarkup(<Scatter points={points} trend />);
    const trend = tags(html, "line").find(
      (tag) => attr(tag, "stroke-dasharray") === "3 4",
    )!;
    expect(Math.min(Number(attr(trend, "y1")), Number(attr(trend, "y2")))).toBe(
      top(plain),
    );
  });
});
