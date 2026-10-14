import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Bump } from "./bump";

const markXs = (html: string, name: string) =>
  [...html.matchAll(/<circle\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter(
      (tag) => tag.includes(`data-series="${name}"`) && tag.includes('r="3"'),
    )
    .map((tag) => Number(/\bcx="([^"]+)"/.exec(tag)?.[1]));

describe("Bump series lengths", () => {
  it("spans the longest series and ends shorter series at their last stage", () => {
    const html = renderToStaticMarkup(
      <Bump
        series={[
          { name: "short", ranks: [2, 1] },
          { name: "long", ranks: [1, 2, 1] },
        ]}
        labels={["A", "B", "C"]}
      />,
    );
    const shortXs = markXs(html, "short");
    const longXs = markXs(html, "long");
    const lastStageX = Number(
      /<text x="([^"]+)"[^>]*>C<\/text>/.exec(html)?.[1],
    );

    expect(html).not.toContain("NaN");
    expect(shortXs).toHaveLength(2);
    expect(longXs).toHaveLength(3);
    expect(shortXs).toEqual(longXs.slice(0, 2));
    expect(longXs[2]).toBeGreaterThan(longXs[1]!);
    expect(lastStageX).toBe(longXs[2]);
  });

  it("keeps aligned stages for equal-length series", () => {
    const html = renderToStaticMarkup(
      <Bump
        series={[
          { name: "first", ranks: [2, 1, 2] },
          { name: "second", ranks: [1, 2, 1] },
        ]}
      />,
    );
    const firstXs = markXs(html, "first");
    const secondXs = markXs(html, "second");

    expect(firstXs).toHaveLength(3);
    expect(secondXs).toEqual(firstXs);
    expect(firstXs[2]).toBeGreaterThan(firstXs[1]!);
  });
});
