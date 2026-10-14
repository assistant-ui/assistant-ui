import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DifferenceArea } from "./difference-area";

const markPaths = (actual: number[], reference: number[]) => {
  let html = "";
  expect(() => {
    html = renderToStaticMarkup(
      <DifferenceArea
        actual={{ name: "actual", data: actual }}
        reference={{ name: "reference", data: reference }}
      />,
    );
  }).not.toThrow();
  return [...html.matchAll(/<path\b[^>]*data-part="mark"[^>]*>/g)].map(
    ([tag]) => /\bd="([^"]*)"/.exec(tag)?.[1] ?? "",
  );
};

const cubicSegments = (path: string) => (path.match(/C/g) ?? []).length;

describe("DifferenceArea mismatched lengths", () => {
  it("keeps the full actual line when reference ends early", () => {
    const paths = markPaths([10, 20, 30, 40], [15, 25, 35]);
    expect(paths).toHaveLength(4);
    expect(paths.map(cubicSegments)).toEqual([4, 4, 2, 3]);
  });

  it("keeps the full reference line when actual ends early", () => {
    const paths = markPaths([10, 20, 30], [15, 25, 35, 45]);
    expect(paths).toHaveLength(4);
    expect(paths.map(cubicSegments)).toEqual([4, 4, 3, 2]);
  });
});
