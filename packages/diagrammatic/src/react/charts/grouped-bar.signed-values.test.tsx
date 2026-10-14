import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GroupedBar } from "./grouped-bar";

const rawAttribute = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];
const attribute = (tag: string, name: string) =>
  Number(rawAttribute(tag, name));
const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );

describe("GroupedBar signed values", () => {
  it("draws negative bars inside the plot from zero", () => {
    const html = renderToStaticMarkup(
      <GroupedBar
        groups={["Q1"]}
        series={[
          { name: "a", data: [-5] },
          { name: "b", data: [10] },
        ]}
      />,
    );
    const hit = tags(html, "rect").find(
      (tag) =>
        rawAttribute(tag, "fill") === "transparent" &&
        rawAttribute(tag, "data-part") === "mark",
    )!;
    const bottom = attribute(hit, "y") + attribute(hit, "height");
    const rect = tags(html, "rect").find(
      (tag) => rawAttribute(tag, "data-series") === "a",
    )!;
    expect(attribute(rect, "height")).toBeGreaterThan(0);
    expect(
      attribute(rect, "y") + attribute(rect, "height"),
    ).toBeLessThanOrEqual(bottom);
  });

  it.each(["tick", "guide"])("includes a negative %s", (source) => {
    const html = renderToStaticMarkup(
      <GroupedBar
        groups={["Q1"]}
        series={[{ name: "a", data: [5] }]}
        {...(source === "tick" ? { yTicks: [{ at: -10, label: "-10" }] } : {})}
        {...(source === "guide" ? { guides: [{ at: -8 }] } : {})}
      />,
    );
    const hit = tags(html, "rect").find(
      (tag) =>
        rawAttribute(tag, "fill") === "transparent" &&
        rawAttribute(tag, "data-part") === "mark",
    )!;
    const bottom = attribute(hit, "y") + attribute(hit, "height");
    const rect = tags(html, "rect").find(
      (tag) => rawAttribute(tag, "data-series") === "a",
    )!;
    expect(attribute(rect, "y") + attribute(rect, "height")).toBeLessThan(
      bottom,
    );
  });

  it("keeps the baseline and all non-negative bars at the plot bottom", () => {
    const html = renderToStaticMarkup(
      <GroupedBar
        groups={["Q1", "Q2"]}
        series={[{ name: "a", data: [4, 8] }]}
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
    const bars = tags(html, "rect").filter(
      (tag) => rawAttribute(tag, "data-series") === "a",
    );
    expect(bars).toHaveLength(2);
    for (const bar of bars) {
      expect(attribute(bar, "y") + attribute(bar, "height")).toBe(bottom);
    }
  });
});
