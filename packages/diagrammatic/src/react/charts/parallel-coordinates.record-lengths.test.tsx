import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ParallelCoordinates } from "./parallel-coordinates";

const mark = (html: string, name: string) => {
  const match = new RegExp(
    `<g data-part="mark" data-series="${name}">([\\s\\S]*?)<\\/g>`,
  ).exec(html);
  expect(match).not.toBeNull();
  return match![1]!;
};

const path = (html: string, name: string) => {
  const match = /<path d="([^"]*)"/.exec(mark(html, name));
  expect(match).not.toBeNull();
  return match![1]!;
};

describe("ParallelCoordinates record lengths", () => {
  it("ignores values beyond the last axis", () => {
    const render = () =>
      renderToStaticMarkup(
        <ParallelCoordinates
          axes={["a", "b"]}
          records={[{ name: "long", values: [1, 2, 999] }]}
        />,
      );
    expect(render).not.toThrow();
    const html = render();
    expect(path(html, "long")).toMatch(/^M[^ML]+ L[^ML]+$/);
    expect(mark(html, "long").match(/<circle /g) ?? []).toHaveLength(2);
  });

  it("excludes absent values from the axis domain and marks", () => {
    const html = renderToStaticMarkup(
      <ParallelCoordinates
        axes={["a", "b", "c"]}
        records={[
          { name: "short", values: [2, 3] },
          { name: "low", values: [4, 5, 10] },
          { name: "high", values: [6, 7, 20] },
        ]}
      />,
    );
    const bottom = Number(/<line[^>]*y2="([^"]+)"/.exec(html)?.[1]);
    const lowCircles = [
      ...mark(html, "low").matchAll(/<circle [^>]*cy="([^"]+)"/g),
    ];
    expect(Number.isFinite(bottom)).toBe(true);
    expect(lowCircles).toHaveLength(3);
    expect(Number(lowCircles[2]?.[1])).toBe(bottom);
    expect(mark(html, "short").match(/<circle /g) ?? []).toHaveLength(2);
    expect(path(html, "short")).toMatch(/^M[^ML]+ L[^ML]+$/);
  });

  it.each([
    ["NaN", NaN],
    ["positive infinity", Infinity],
    ["negative infinity", -Infinity],
  ])("breaks the line at %s", (_, missing) => {
    const html = renderToStaticMarkup(
      <ParallelCoordinates
        axes={["a", "b", "c", "d", "e"]}
        records={[
          { name: "gap", values: [1, 2, missing, 4, 5] },
          { name: "complete", values: [2, 3, 3, 5, 6] },
        ]}
      />,
    );
    expect(path(html, "gap")).toMatch(/^M[^ML]+ L[^ML]+ M[^ML]+ L[^ML]+$/);
    expect(mark(html, "gap").match(/<circle /g) ?? []).toHaveLength(4);
  });
});
