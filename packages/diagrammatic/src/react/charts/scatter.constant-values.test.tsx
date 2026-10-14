import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { frame } from "../svg";
import { Scatter } from "./scatter";

describe("Scatter constant values", () => {
  it.each(["x", "y"] as const)("centers a constant %s dimension", (axis) => {
    const points =
      axis === "x"
        ? [
            { x: 12, y: 3 },
            { x: 12, y: 9 },
          ]
        : [
            { x: 3, y: -8 },
            { x: 9, y: -8 },
          ];
    const html = renderToStaticMarkup(<Scatter points={points} />);
    const mark = /<circle[^>]*data-part="mark"[^>]*>/.exec(html);
    expect(mark).not.toBeNull();
    const coordinate = axis === "x" ? "cx" : "cy";
    const match = new RegExp(`${coordinate}="([^"]+)"`).exec(mark![0]);
    expect(match).not.toBeNull();
    const actual = Number(match![1]);
    expect(Number.isFinite(actual)).toBe(true);
    const F = frame({}, 5 / 3, { labels: true, ticks: false });
    const center =
      axis === "x" ? (F.left + F.right) / 2 : (F.top + F.bottom) / 2;
    expect(actual).toBeCloseTo(center, 2);
  });
});
