import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { frame } from "../svg";
import { Beeswarm } from "./beeswarm";

const marks = (html: string) =>
  [...html.matchAll(/<circle[^>]*data-part="mark"[^>]*>/g)].map(([tag]) => ({
    cx: Number(/\bcx="([^"]+)"/.exec(tag)?.[1]),
    cy: Number(/\bcy="([^"]+)"/.exec(tag)?.[1]),
    r: Number(/\br="([^"]+)"/.exec(tag)?.[1]),
  }));

describe("Beeswarm tie groups", () => {
  it("keeps every dot of a large tie group inside the plot", () => {
    const html = renderToStaticMarkup(
      <Beeswarm values={Array.from({ length: 78 }, () => 5)} />,
    );
    const dots = marks(html);
    const F = frame({}, 5 / 3, { labels: true });
    expect(dots).toHaveLength(78);
    for (const { cx, cy, r } of dots) {
      expect(cx - r).toBeGreaterThanOrEqual(0);
      expect(cx + r).toBeLessThanOrEqual(F.width);
      expect(cy - r).toBeGreaterThanOrEqual(F.top);
      expect(cy + r).toBeLessThanOrEqual(F.bottom);
    }
  });

  it("keeps the original lane pitch when the group fits", () => {
    const html = renderToStaticMarkup(<Beeswarm values={[5, 5, 5]} />);
    const F = frame({}, 5 / 3, { labels: true });
    const mid = (F.top + F.bottom) / 2;
    expect(marks(html).map(({ cy }) => cy)).toEqual([mid, mid + 8, mid - 8]);
  });
});
