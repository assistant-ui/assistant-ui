import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Slope } from "./slope";

const endpoints = (html: string) =>
  [...html.matchAll(/<circle[^>]*>/g)].map(([tag]) => ({
    cx: Number(/\bcx="([^"]+)"/.exec(tag)?.[1]),
    r: Number(/\br="([^"]+)"/.exec(tag)?.[1]),
  }));

describe("Slope long labels", () => {
  it("keeps both endpoints in the viewBox and truncates a long label", () => {
    const label = "A very long label ".repeat(12);
    const html = renderToStaticMarkup(
      <Slope
        width={320}
        labels={["start", "end"]}
        items={[{ label, from: 1, to: 2 }]}
      />,
    );
    const dots = endpoints(html);
    expect(dots).toHaveLength(2);
    expect(dots[0]!.cx).toBeLessThan(dots[1]!.cx);
    expect(dots[1]!.cx - dots[0]!.cx).toBeGreaterThanOrEqual(100);
    for (const { cx, r } of dots) {
      expect(cx - r).toBeGreaterThanOrEqual(0);
      expect(cx + r).toBeLessThanOrEqual(320);
    }
    expect(html).not.toContain(`>${label}</text>`);
  });

  it("keeps endpoint positions when the label fits", () => {
    const html = renderToStaticMarkup(
      <Slope width={320} items={[{ label: "ok", from: 1, to: 2 }]} />,
    );
    expect(endpoints(html).map(({ cx }) => cx)).toEqual([64.8, 235.2]);
  });
});
