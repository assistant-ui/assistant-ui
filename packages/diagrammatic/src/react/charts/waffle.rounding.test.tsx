import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Waffle } from "./waffle";

const countsFor = (values: number[]) => {
  const html = renderToStaticMarkup(
    <Waffle
      legend={false}
      items={values.map((value, i) => ({ label: `share-${i}`, value }))}
    />,
  );
  const counts = values.map(() => 0);
  for (const match of html.matchAll(
    /<rect[^>]*data-part="mark"[^>]*data-series="share-(\d+)"/g,
  )) {
    counts[Number(match[1])]! += 1;
  }
  return counts;
};

describe("Waffle rounding", () => {
  it("assigns overrounding by largest remainder without truncating the last share", () => {
    expect(countsFor([0.2, 33.5, 33.5, 32.8])).toEqual([0, 34, 33, 33]);
  });

  it("assigns underrounding to the largest fractional share", () => {
    expect(countsFor([0.2, 33.3, 33.3, 33.2])).toEqual([0, 34, 33, 33]);
  });

  it("keeps counts whose rounded shares already sum to 100", () => {
    expect(countsFor([20.2, 30.2, 49.6])).toEqual([20, 30, 50]);
  });
});
