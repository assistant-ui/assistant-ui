import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Waterfall } from "./waterfall";

const rawAttribute = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];
const attribute = (tag: string, name: string) =>
  Number(rawAttribute(tag, name));
const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );

describe("Waterfall signed values", () => {
  it("keeps a negative running total inside the plot", () => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[
          { label: "start", value: 10, total: true },
          { label: "drop", value: -15 },
        ]}
      />,
    );
    const bottom = attribute(/<svg[^>]*>/.exec(html)![0], "height") - 25;
    const mark = /<g[^>]*data-i="1"[^>]*><rect[^>]+/.exec(html)![0];
    const rect = /<rect[^>]+/.exec(mark)![0];
    expect(
      attribute(rect, "y") + attribute(rect, "height"),
    ).toBeLessThanOrEqual(bottom);
  });

  it("keeps a small negative total inside the plot", () => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[
          { label: "gain", value: 10, total: true },
          { label: "loss", value: -0.00001, total: true },
        ]}
      />,
    );
    const bottom = attribute(/<svg[^>]*>/.exec(html)![0], "height") - 25;
    const mark = /<g[^>]*data-i="1"[^>]*><rect[^>]+/.exec(html)![0];
    const rect = /<rect[^>]+/.exec(mark)![0];
    expect(
      attribute(rect, "y") + attribute(rect, "height"),
    ).toBeLessThanOrEqual(bottom);
  });

  it.each(["tick", "guide"])("includes a negative %s", (source) => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[{ label: "start", value: 10, total: true }]}
        {...(source === "tick" ? { yTicks: [{ at: -10, label: "-10" }] } : {})}
        {...(source === "guide" ? { guides: [{ at: -8 }] } : {})}
      />,
    );
    const bottom = attribute(/<svg[^>]*>/.exec(html)![0], "height") - 25;
    const mark = /<g[^>]*data-i="0"[^>]*><rect[^>]+/.exec(html)![0];
    const rect = /<rect[^>]+/.exec(mark)![0];
    expect(attribute(rect, "y") + attribute(rect, "height")).toBeLessThan(
      bottom,
    );
  });

  it("keeps the baseline and non-negative total at the plot bottom", () => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[
          { label: "start", value: 4, total: true },
          { label: "gain", value: 8, total: true },
        ]}
      />,
    );
    const bottom = attribute(tags(html, "svg")[0]!, "height") - 25;
    const baseline = tags(html, "line").find(
      (tag) => rawAttribute(tag, "data-part") === "grid",
    )!;
    expect(attribute(baseline, "y1")).toBe(bottom);
    const bars = tags(html, "rect");
    expect(bars).toHaveLength(2);
    for (const bar of bars) {
      expect(attribute(bar, "y") + attribute(bar, "height")).toBe(bottom);
    }
  });

  it("puts negative step labels below their bars and keeps positive labels above", () => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[
          { label: "start", value: 10, total: true },
          { label: "drop", value: -15 },
          { label: "rise", value: 3 },
        ]}
      />,
    );
    const marks = tags(html, "g").filter(
      (tag) => rawAttribute(tag, "data-part") === "mark",
    );
    expect(marks).toHaveLength(3);
    for (const [index, value] of [
      [1, -15],
      [2, 3],
    ] as const) {
      const start = html.indexOf(marks[index]!);
      const group = html.slice(start, html.indexOf("</g>", start));
      const rect = tags(group, "rect")[0]!;
      const label = tags(group, "text")[0]!;
      const y = attribute(label, "y");
      if (value < 0) {
        expect(y).toBeGreaterThan(
          attribute(rect, "y") + attribute(rect, "height"),
        );
        expect(rawAttribute(label, "dominant-baseline")).toBe("hanging");
      } else {
        expect(y).toBe(attribute(rect, "y") - 3);
        expect(rawAttribute(label, "dominant-baseline")).toBeUndefined();
      }
    }
  });

  it("keeps the lowest negative step label above the category label", () => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[
          { label: "start", value: 10, total: true },
          { label: "drop", value: -15 },
        ]}
      />,
    );
    const fontSize = attribute(tags(html, "svg")[0]!, "font-size");
    const mark = tags(html, "g").find(
      (tag) => rawAttribute(tag, "data-i") === "1",
    )!;
    const start = html.indexOf(mark);
    const labels = tags(html.slice(start, html.indexOf("</g>", start)), "text");
    const value = labels[0]!;
    const category = labels[1]!;
    const valueHeight =
      Number.parseFloat(rawAttribute(value, "font-size") ?? "1em") * fontSize;
    expect(attribute(value, "y") + valueHeight).toBeLessThanOrEqual(
      attribute(category, "y") - fontSize,
    );
  });

  it("keeps the plot bottom when a negative total has no value label", () => {
    const html = renderToStaticMarkup(
      <Waterfall steps={[{ label: "loss", value: -5, total: true }]} />,
    );
    const svg = tags(html, "svg")[0]!;
    const bar = tags(html, "rect")[0]!;
    expect(attribute(bar, "y") + attribute(bar, "height")).toBe(
      attribute(svg, "height") - 25,
    );
  });
});
