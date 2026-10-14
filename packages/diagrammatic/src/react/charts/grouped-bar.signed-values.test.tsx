import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GroupedBar } from "./grouped-bar";

const attribute = (tag: string, name: string) =>
  Number(new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]);
const digest = async (markup: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markup)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

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
    const hit = /<rect[^>]*fill="transparent"[^>]*data-part="mark"/.exec(
      html,
    )![0];
    const bottom = attribute(hit, "y") + attribute(hit, "height");
    const rect = /<rect[^>]*data-series="a"[^>]*>/.exec(html)![0];
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
    const hit = /<rect[^>]*fill="transparent"[^>]*data-part="mark"/.exec(
      html,
    )![0];
    const bottom = attribute(hit, "y") + attribute(hit, "height");
    const rect = /<rect[^>]*data-series="a"[^>]*>/.exec(html)![0];
    expect(attribute(rect, "y") + attribute(rect, "height")).toBeLessThan(
      bottom,
    );
  });

  it("keeps non-negative markup byte-identical", async () => {
    const html = renderToStaticMarkup(
      <GroupedBar
        groups={["Q1", "Q2"]}
        series={[{ name: "a", data: [4, 8] }]}
      />,
    );
    expect(await digest(html)).toBe(
      "5ad9a62793be51596917b96cfc948d94447d2861e8a9831f1f6716972abcf2bd",
    );
  });
});
