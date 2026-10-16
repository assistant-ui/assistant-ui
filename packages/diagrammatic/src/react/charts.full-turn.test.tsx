import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as dg from "../index";

const markPaths = (element: ReactElement) =>
  [...renderToStaticMarkup(element).matchAll(/<path\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes('data-part="mark"'))
    .map((tag) => /\bd="([^"]*)"/.exec(tag)![1]!);

const outerArc = (d: string) => {
  const match = /^M(\S+) (\S+) A\S+ \S+ \S+ \S+ \S+ (\S+) (\S+)/.exec(d);
  expect(match).not.toBeNull();
  const [, startX, startY, endX, endY] = match!;
  return { start: [startX, startY], end: [endX, endY] };
};

describe("charts with a full-turn sector", () => {
  const cases: Record<string, ReactElement> = {
    "a one-slice Pie": <dg.Pie items={[{ label: "Only", value: 1 }]} />,
    "a one-slice donut Pie": (
      <dg.Pie items={[{ label: "Only", value: 1 }]} inner={0.62} />
    ),
    "a one-item PolarArea": (
      <dg.PolarArea items={[{ label: "Only", value: 3 }]} />
    ),
    "a Sunburst whose root has one child": (
      <dg.Sunburst
        root={{
          label: "root",
          children: [
            {
              label: "only",
              children: [
                { label: "a", value: 1 },
                { label: "b", value: 3 },
              ],
            },
          ],
        }}
      />
    ),
  };

  for (const [name, element] of Object.entries(cases)) {
    it(`draws ${name}`, () => {
      const paths = markPaths(element);

      expect(paths.length).toBeGreaterThan(0);
      for (const d of paths) {
        const { start, end } = outerArc(d);
        expect(end).not.toEqual(start);
      }
    });
  }
});
