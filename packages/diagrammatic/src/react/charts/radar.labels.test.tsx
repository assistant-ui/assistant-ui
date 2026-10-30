import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textWidth } from "../../core/text";
import { Radar } from "./radar";

function label(html: string, text: string) {
  const match = [...html.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].find(
    ([, , content]) => content === text,
  );
  if (!match) throw new Error(`Missing Radar label: ${text}`);
  const attrs = match[1]!;
  return {
    x: Number(/\bx="([^"]+)"/.exec(attrs)?.[1]),
    y: Number(/\by="([^"]+)"/.exec(attrs)?.[1]),
    textAnchor: /\btext-anchor="([^"]+)"/.exec(attrs)?.[1],
  };
}

function outerRadius(html: string, axisCount: number) {
  const grid = [...html.matchAll(/<path\b[^>]*>/g)].find(([tag]) =>
    tag!.includes('data-part="grid"'),
  );
  const path = /\bd="([^"]+)"/.exec(grid?.[0] ?? "")?.[1] ?? "";
  const points = [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)];
  const firstX = Number(points[0]?.[1]);
  const firstY = Number(points[0]?.[2]);
  const secondY = Number(points[1]?.[2]);
  const radius = (secondY - firstY) / (1 - Math.cos((2 * Math.PI) / axisCount));
  return { cx: firstX, cy: firstY + radius, radius };
}

function distanceFromInterval(value: number, start: number, end: number) {
  return value < start ? start - value : value > end ? value - end : 0;
}

describe("Radar labels", () => {
  it("anchors the reported diagonal labels away from the polygon vertices", () => {
    const html = renderToStaticMarkup(
      <Radar
        axes={[
          "Throughput",
          "Reliability",
          "Latency budget",
          "Cost efficiency",
          "Observability",
          "Security posture",
        ]}
        series={[
          { name: "A", data: [9, 7, 10, 8, 9, 7] },
          { name: "B", data: [6, 9, 5, 7, 6, 9] },
        ]}
      />,
    );

    expect(label(html, "Reliability").textAnchor).toBe("start");
    expect(label(html, "Latency budget").textAnchor).toBe("start");
    expect(label(html, "Observability").textAnchor).toBe("end");
    expect(label(html, "Security posture").textAnchor).toBe("end");
  });

  it("centers near-vertical labels only when their extent fits the radial gap", () => {
    const axes = Array.from({ length: 24 }, (_, i) => `Axis ${i}`);
    axes[0] = "N";
    axes[1] = "Near vertical";
    const html = renderToStaticMarkup(
      <Radar
        height={640}
        fontSize={20}
        axes={axes}
        series={[{ name: "A", data: axes.map(() => 1) }]}
      />,
    );

    expect(label(html, "N").textAnchor).toBe("middle");
    expect(label(html, "Near vertical").textAnchor).toBe("start");
  });

  it("keeps diagonal text outside the polygon at large font sizes", () => {
    const axes = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const fontSize = 48;
    const html = renderToStaticMarkup(
      <Radar
        height={640}
        fontSize={fontSize}
        axes={axes}
        series={[{ name: "A", data: axes.map(() => 1) }]}
      />,
    );
    const { cx, cy, radius } = outerRadius(html, axes.length);

    for (const text of ["NE", "SE", "SW", "NW"]) {
      const rendered = label(html, text);
      const width = textWidth(text, fontSize);
      const left =
        rendered.textAnchor === "start"
          ? rendered.x
          : rendered.textAnchor === "end"
            ? rendered.x - width
            : rendered.x - width / 2;
      const nearestX = distanceFromInterval(cx, left, left + width);
      const nearestY = distanceFromInterval(
        cy,
        rendered.y - fontSize / 2,
        rendered.y + fontSize / 2,
      );

      expect(Math.hypot(nearestX, nearestY)).toBeGreaterThanOrEqual(radius);
    }
  });
});
