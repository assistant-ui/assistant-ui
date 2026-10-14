import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Column } from "./column";

const rawAttribute = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];
const attribute = (tag: string, name: string) =>
  Number(rawAttribute(tag, name));
const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );

describe("Column signed values", () => {
  it("draws a negative column inside the plot from zero", () => {
    const html = renderToStaticMarkup(
      <Column
        items={[
          { label: "gain", value: 10 },
          { label: "loss", value: -5 },
        ]}
      />,
    );
    const hit = tags(html, "rect").find(
      (tag) =>
        rawAttribute(tag, "fill") === "transparent" &&
        rawAttribute(tag, "data-part") === "mark",
    )!;
    const bottom = attribute(hit, "y") + attribute(hit, "height");
    const mark = /<g[^>]*data-i="1"[^>]*><rect[^>]+/.exec(html)![0];
    const rect = /<rect[^>]+/.exec(mark)![0];
    expect(attribute(rect, "height")).toBeGreaterThan(0);
    expect(
      attribute(rect, "y") + attribute(rect, "height"),
    ).toBeLessThanOrEqual(bottom);
  });

  it.each(["tick", "guide"])(
    "includes a negative %s in the linear domain",
    (source) => {
      const html = renderToStaticMarkup(
        <Column
          items={[{ label: "gain", value: 5 }]}
          {...(source === "tick"
            ? { yTicks: [{ at: -10, label: "-10" }] }
            : {})}
          {...(source === "guide" ? { guides: [{ at: -8 }] } : {})}
        />,
      );
      const hit = tags(html, "rect").find(
        (tag) =>
          rawAttribute(tag, "fill") === "transparent" &&
          rawAttribute(tag, "data-part") === "mark",
      )!;
      const bottom = attribute(hit, "y") + attribute(hit, "height");
      const mark = /<g[^>]*data-i="0"[^>]*><rect[^>]+/.exec(html)![0];
      const rect = /<rect[^>]+/.exec(mark)![0];
      expect(attribute(rect, "y") + attribute(rect, "height")).toBeLessThan(
        bottom,
      );
    },
  );

  it("keeps the baseline and all non-negative columns at the plot bottom", () => {
    const html = renderToStaticMarkup(
      <Column
        items={[
          { label: "a", value: 4 },
          { label: "b", value: 8 },
        ]}
      />,
    );
    const hit = tags(html, "rect").find(
      (tag) => rawAttribute(tag, "fill") === "transparent",
    )!;
    const bottom = attribute(hit, "y") + attribute(hit, "height");
    const baseline = tags(html, "line").find(
      (tag) => rawAttribute(tag, "data-part") === "grid",
    )!;
    expect(attribute(baseline, "y1")).toBe(bottom);
    const columns = tags(html, "rect").filter(
      (tag) => rawAttribute(tag, "fill") !== "transparent",
    );
    expect(columns).toHaveLength(2);
    for (const column of columns) {
      expect(attribute(column, "y") + attribute(column, "height")).toBe(bottom);
    }
  });

  it("puts negative value labels below their columns and keeps positive labels above", () => {
    const html = renderToStaticMarkup(
      <Column
        values
        items={[
          { label: "gain", value: 10 },
          { label: "loss", value: -5 },
        ]}
      />,
    );
    const marks = tags(html, "g").filter(
      (tag) => rawAttribute(tag, "data-part") === "mark",
    );
    expect(marks).toHaveLength(2);
    for (const [index, value] of [10, -5].entries()) {
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
        expect(y).toBe(attribute(rect, "y") - 5);
        expect(rawAttribute(label, "dominant-baseline")).toBeUndefined();
      }
    }
  });

  it.each([
    {
      name: "keeps the lowest negative value label above the category label",
      loss: -5,
      yTicks: undefined,
    },
    {
      name: "keeps a negative value label above the category label with a lower tick",
      loss: -9.8,
      yTicks: [{ at: -10, label: "-10" }],
    },
  ])("$name", ({ loss, yTicks }) => {
    const html = renderToStaticMarkup(
      <Column
        values
        {...(yTicks ? { yTicks } : {})}
        items={[
          { label: "gain", value: 10 },
          { label: "loss", value: loss },
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

  it("keeps the plot bottom when a negative column has no value label", () => {
    const html = renderToStaticMarkup(
      <Column categorical items={[{ label: "loss", value: -5 }]} />,
    );
    const svg = tags(html, "svg")[0]!;
    const hit = tags(html, "rect").find(
      (tag) => rawAttribute(tag, "fill") === "transparent",
    )!;
    expect(attribute(hit, "y") + attribute(hit, "height")).toBe(
      attribute(svg, "height") - 25,
    );
  });
});
