import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StackedBar } from "./stacked-bar";

const readAttr = (tag: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

const attr = (tag: string, name: string) => {
  const value = readAttr(tag, name);
  expect(value).toBeDefined();
  return value!;
};

const group = (html: string, part: string, label: string) => {
  const markup = [...html.matchAll(/<g\b[^>]*>/g)]
    .filter(([tag]) => readAttr(tag, "data-part") === part)
    .map((match) =>
      html.slice(match.index, html.indexOf("</g>", match.index) + 4),
    )
    .find((candidate) => candidate.includes(`>${label}</text>`));
  expect(markup).toBeDefined();
  return markup!;
};

const lineY = (markup: string) => {
  const line = /<line\b[^>]*>/.exec(markup)?.[0];
  expect(line).toBeDefined();
  return Number(attr(line!, "y1"));
};

describe("StackedBar normalized axis", () => {
  it("positions share guides and ticks against the bars", () => {
    const html = renderToStaticMarkup(
      <StackedBar
        normalize
        groups={["A"]}
        series={[{ name: "value", data: [40] }]}
        yTicks={2}
        guides={[{ at: 50, label: "half" }]}
      />,
    );
    const bar = [...html.matchAll(/<rect\b[^>]*>/g)]
      .map(([tag]) => tag)
      .find(
        (tag) =>
          readAttr(tag, "data-part") === "mark" &&
          readAttr(tag, "data-series") === "value",
      );
    expect(bar).toBeDefined();
    const top = Number(attr(bar!, "y"));
    const bottom = top + Number(attr(bar!, "height"));

    expect(lineY(group(html, "guide", "half"))).toBeCloseTo(
      (top + bottom) / 2,
      1,
    );
    expect(lineY(group(html, "grid", "100%"))).toBeCloseTo(top, 1);
    expect(lineY(group(html, "grid", "50%"))).toBeCloseTo(
      (top + bottom) / 2,
      1,
    );
  });

  it("keeps a caller's tick formatter", () => {
    const html = renderToStaticMarkup(
      <StackedBar
        normalize
        groups={["A"]}
        series={[{ name: "value", data: [40] }]}
        yTicks={2}
        format={(value) => `${value} shares`}
      />,
    );

    expect(html).toContain(">100 shares</text>");
  });
});
