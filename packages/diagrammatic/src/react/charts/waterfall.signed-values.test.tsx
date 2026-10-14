import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Waterfall } from "./waterfall";

const attribute = (tag: string, name: string) =>
  Number(new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]);
const digest = async (markup: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markup)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

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

  it("keeps non-negative markup byte-identical", async () => {
    const html = renderToStaticMarkup(
      <Waterfall
        steps={[
          { label: "start", value: 4, total: true },
          { label: "gain", value: 8 },
        ]}
      />,
    );
    expect(await digest(html)).toBe(
      "feb3675912b179033d52af691b591117453297aa578c9cbad3edf583674b02d1",
    );
  });
});
