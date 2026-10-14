import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Treemap } from "./treemap";

describe("Treemap non-positive tiles", () => {
  it("omits non-positive children and keeps positive children at their original indices", () => {
    const html = renderToStaticMarkup(
      <Treemap
        root={{
          label: "root",
          children: [
            { label: "first", value: 5 },
            { label: "zero", value: 0 },
            { label: "second", value: 3 },
            { label: "negative", value: -2 },
            { label: "third", value: 2 },
          ],
        }}
      />,
    );

    expect(html).not.toContain("NaN");
    expect(html).not.toContain('data-series="zero"');
    expect(html).not.toContain('data-series="negative"');
    expect(html).not.toContain(">zero</text>");
    expect(html).not.toContain(">negative</text>");
    expect(
      [
        ...html.matchAll(/<rect[^>]*data-i="(\d+)"[^>]*data-series="([^"]+)"/g),
      ].map((match) => [match[1], match[2]]),
    ).toEqual([
      ["0", "first"],
      ["2", "second"],
      ["4", "third"],
    ]);
  });

  it("omits non-positive grandchildren without shifting the parent index", () => {
    const html = renderToStaticMarkup(
      <Treemap
        root={{
          label: "root",
          children: [
            { label: "empty", value: 0 },
            {
              label: "group",
              children: [
                { label: "nested-zero", value: 0 },
                { label: "nested-positive", value: 5 },
              ],
            },
          ],
        }}
      />,
    );

    expect(html).not.toContain("NaN");
    expect(html).not.toContain('data-series="empty"');
    expect(html).not.toContain('data-series="nested-zero"');
    expect(html).not.toContain(">nested-zero</text>");
    expect(html).toMatch(
      /<rect[^>]*data-i="1"[^>]*data-series="nested-positive"/,
    );
  });

  it("renders an empty plot area for all-zero and all-negative inputs", () => {
    for (const values of [
      [0, 0],
      [-2, -3],
    ]) {
      const html = renderToStaticMarkup(
        <Treemap
          root={{
            label: "root",
            children: values.map((value, i) => ({
              label: `tile-${i}`,
              value,
            })),
          }}
        />,
      );

      expect(html).not.toContain("NaN");
      expect(html).not.toContain("<rect");
      expect(html).not.toContain("<text");
    }
  });
});
