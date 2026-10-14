import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DifferenceArea } from "./difference-area";

const render = (props: { legend?: boolean } = {}) =>
  renderToStaticMarkup(
    <DifferenceArea
      actual={{ name: "actual", data: [0, 10] }}
      reference={{ name: "reference", data: [10, 0] }}
      {...props}
    />,
  );

const markPaths = (html: string) =>
  [...html.matchAll(/<path\b[^>]*data-part="mark"[^>]*>/g)].map(
    ([tag]) => /\bd="([^"]*)"/.exec(tag)?.[1] ?? "",
  );

const points = (path: string) => {
  const values = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(([n]) => Number(n));
  return Array.from({ length: values.length / 2 }, (_, i) => ({
    x: values[i * 2]!,
    y: values[i * 2 + 1]!,
  }));
};

type Point = { x: number; y: number };

const samplePath = (path: string, steps: number, skipVertical = false) => {
  const tokens = [...path.matchAll(/[MLCZ]|-?\d+(?:\.\d+)?/g)].map(
    ([token]) => token,
  );
  const samples: Point[] = [];
  let current: Point = { x: 0, y: 0 };
  let index = 0;
  const nextPoint = (): Point => ({
    x: Number(tokens[index++]!),
    y: Number(tokens[index++]!),
  });
  while (index < tokens.length) {
    const command = tokens[index++];
    if (command === "M") {
      current = nextPoint();
      samples.push(current);
    } else if (command === "L" || command === "C") {
      const start = current;
      const control1 = command === "C" ? nextPoint() : start;
      const control2 = command === "C" ? nextPoint() : start;
      const end = nextPoint();
      if (!skipVertical || Math.abs(end.x - start.x) > 0.01) {
        for (let step = 1; step <= steps; step += 1) {
          const t = step / steps;
          const point =
            command === "L"
              ? {
                  x: start.x + (end.x - start.x) * t,
                  y: start.y + (end.y - start.y) * t,
                }
              : {
                  x:
                    (1 - t) ** 3 * start.x +
                    3 * (1 - t) ** 2 * t * control1.x +
                    3 * (1 - t) * t ** 2 * control2.x +
                    t ** 3 * end.x,
                  y:
                    (1 - t) ** 3 * start.y +
                    3 * (1 - t) ** 2 * t * control1.y +
                    3 * (1 - t) * t ** 2 * control2.y +
                    t ** 3 * end.y,
                };
          samples.push(point);
        }
      }
      current = end;
    }
  }
  return samples;
};

describe("DifferenceArea crossings and legend", () => {
  it("omits the built-in legend and frees its frame space", () => {
    const withLegend = render();
    const withoutLegend = render({ legend: false });
    expect(withLegend).toContain('data-part="legend"');
    expect(withoutLegend).not.toContain('data-part="legend"');
    expect(points(markPaths(withoutLegend)[2]!)[0]!.y).toBeLessThan(
      points(markPaths(withLegend)[2]!)[0]!.y,
    );
  });

  it("starts the positive band at the interpolated crossing", () => {
    const paths = markPaths(render());
    const referenceLine = points(paths[2]!);
    const crossingX = (referenceLine[0]!.x + referenceLine[1]!.x) / 2;
    expect(Math.min(...points(paths[0]!).map((p) => p.x))).toBeCloseTo(
      crossingX,
      2,
    );
  });

  it("ends the negative band at the interpolated crossing", () => {
    const paths = markPaths(render());
    const referenceLine = points(paths[2]!);
    const crossingX = (referenceLine[0]!.x + referenceLine[1]!.x) / 2;
    expect(Math.max(...points(paths[1]!).map((p) => p.x))).toBeCloseTo(
      crossingX,
      2,
    );
  });

  it("keeps both band edges within 0.5px of the drawn curves", () => {
    const html = renderToStaticMarkup(
      <DifferenceArea
        actual={{ name: "actual", data: [0, 30, 4, 28] }}
        reference={{ name: "reference", data: [20, 8, 27, 2] }}
      />,
    );
    const paths = markPaths(html);
    const lineSamples = [
      ...samplePath(paths[2]!, 1000),
      ...samplePath(paths[3]!, 1000),
    ];
    for (const band of paths.slice(0, 2)) {
      const edgeSamples = samplePath(band, 8, true);
      expect(edgeSamples.length).toBeGreaterThan(20);
      for (const point of edgeSamples) {
        const distance = Math.min(
          ...lineSamples.map((linePoint) =>
            Math.hypot(point.x - linePoint.x, point.y - linePoint.y),
          ),
        );
        expect(distance).toBeLessThan(0.5);
      }
    }
  });
});
