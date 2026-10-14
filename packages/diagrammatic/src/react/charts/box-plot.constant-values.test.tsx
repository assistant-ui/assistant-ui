import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { frame } from "../svg";
import { BoxPlot } from "./box-plot";

describe("BoxPlot constant values", () => {
  it.each([0, 20, -20])("centers a box at %s", (value) => {
    const html = renderToStaticMarkup(
      <BoxPlot
        groups={[
          {
            label: "same",
            low: value,
            q1: value,
            median: value,
            q3: value,
            high: value,
          },
        ]}
      />,
    );
    const mark =
      /<g[^>]*data-part="mark"[^>]*>\s*<g[^>]*>\s*<line[^>]*y1="([^"]+)"/.exec(
        html,
      );
    expect(mark).not.toBeNull();
    const y = Number(mark![1]);
    expect(Number.isFinite(y)).toBe(true);
    const F = frame({}, 5 / 3, { labels: true });
    expect(y).toBeCloseTo((F.top + F.bottom) / 2, 2);
  });
});
