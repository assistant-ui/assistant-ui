import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DifferenceArea } from "./difference-area";

const chartMarks = (actual: number[], reference: number[]) => {
  let html = "";
  expect(() => {
    html = renderToStaticMarkup(
      <DifferenceArea
        actual={{ name: "actual", data: actual }}
        reference={{ name: "reference", data: reference }}
      />,
    );
  }).not.toThrow();
  return {
    paths: [...html.matchAll(/<path\b[^>]*data-part="mark"[^>]*>/g)].map(
      ([tag]) => /\bd="([^"]*)"/.exec(tag)?.[1] ?? "",
    ),
    hitIndices: [...html.matchAll(/<rect\b[^>]*data-i="(\d+)"/g)].map(
      ([, index]) => Number(index),
    ),
  };
};

const pathXs = (path: string) =>
  [...path.matchAll(/([MLC])([^MLCZ]*)/g)].map(([, , coordinates]) => {
    const values = [...coordinates!.matchAll(/-?\d+(?:\.\d+)?/g)].map(
      ([value]) => Number(value),
    );
    return values.at(-2)!;
  });

describe("DifferenceArea mismatched lengths", () => {
  it("keeps the full actual line when reference ends early", () => {
    const { paths, hitIndices } = chartMarks([10, 20, 30, 40], [15, 25, 35]);
    expect(paths).toHaveLength(4);
    const actualXs = pathXs(paths[3]!);
    const referenceXs = pathXs(paths[2]!);
    const sharedXs = actualXs.slice(0, 3);
    const bandXs = [...sharedXs, ...[...sharedXs].reverse()];

    expect(paths.slice(0, 2).map(pathXs)).toEqual([bandXs, bandXs]);
    expect(referenceXs).toEqual(sharedXs);
    expect(referenceXs.at(-1)).toBe(actualXs[2]);
    expect(referenceXs.at(-1)).toBeLessThan(actualXs.at(-1)!);
    expect(hitIndices).toEqual([0, 1, 2, 3]);
  });

  it("keeps the full reference line when actual ends early", () => {
    const { paths, hitIndices } = chartMarks([10, 20, 30], [15, 25, 35, 45]);
    expect(paths).toHaveLength(4);
    const actualXs = pathXs(paths[3]!);
    const referenceXs = pathXs(paths[2]!);
    const sharedXs = referenceXs.slice(0, 3);
    const bandXs = [...sharedXs, ...[...sharedXs].reverse()];

    expect(paths.slice(0, 2).map(pathXs)).toEqual([bandXs, bandXs]);
    expect(actualXs).toEqual(sharedXs);
    expect(actualXs.at(-1)).toBe(referenceXs[2]);
    expect(actualXs.at(-1)).toBeLessThan(referenceXs.at(-1)!);
    expect(hitIndices).toEqual([0, 1, 2, 3]);
  });
});
