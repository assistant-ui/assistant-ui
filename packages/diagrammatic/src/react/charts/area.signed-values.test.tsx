import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Area } from "./area";

const attribute = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];
const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );
const fill = (markup: string) =>
  attribute(
    tags(markup, "path").find(
      (tag) =>
        attribute(tag, "data-part") === "mark" &&
        attribute(tag, "fill") !== "none",
    )!,
    "d",
  )!;
const baseline = (path: string) =>
  Number(/ L[\d.]+ ([\d.]+) Z$/.exec(path)![1]);

describe("Area signed values", () => {
  it("keeps negative points in the plot and fills to zero", () => {
    const html = renderToStaticMarkup(<Area data={[-5, 10]} />);
    const path = fill(html);
    const pointY = Number(/^M[\d.]+ ([\d.]+)/.exec(path)![1]);
    const bottom = 376;
    expect(pointY).toBeLessThanOrEqual(bottom);
    expect(baseline(path)).toBeLessThan(bottom);
  });

  it.each(["tick", "guide"])(
    "includes a negative %s in the domain",
    (source) => {
      const html = renderToStaticMarkup(
        <Area
          data={[5, 10]}
          {...(source === "tick"
            ? { yTicks: [{ at: -10, label: "-10" }] }
            : {})}
          {...(source === "guide" ? { guides: [{ at: -8 }] } : {})}
        />,
      );
      expect(baseline(fill(html))).toBeLessThan(376);
    },
  );

  it("keeps the baseline and non-negative fill at the plot bottom", () => {
    const html = renderToStaticMarkup(<Area data={[4, 8]} />);
    const bottom = 376;
    const line = tags(html, "line").find(
      (tag) => attribute(tag, "data-part") === "grid",
    )!;
    expect(Number(attribute(line, "y1"))).toBe(bottom);
    const base = / L[\d.]+ ([\d.]+) L[\d.]+ ([\d.]+) Z$/.exec(fill(html))!;
    expect([Number(base[1]), Number(base[2])]).toEqual([bottom, bottom]);
  });
});
