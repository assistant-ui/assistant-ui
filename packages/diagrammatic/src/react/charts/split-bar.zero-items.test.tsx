import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SplitBar } from "./split-bar";

describe("SplitBar zero items", () => {
  const rectFor = (values: number[], label: string) => {
    const html = renderToStaticMarkup(
      <SplitBar
        items={values.map((value, i) => ({ label: `part-${i}`, value }))}
      />,
    );
    return html.match(
      new RegExp(`<rect[^>]*data-series="${label}"[^>]*>`),
    )?.[0];
  };

  it("keeps the first visible segment flush after a leading zero", () => {
    expect(rectFor([0, 5], "part-1")).toContain('x="0"');
  });

  it("keeps the last visible segment flush before a trailing zero", () => {
    expect(rectFor([5, 0], "part-0")).toContain('width="60"');
  });

  it("gives zero shares no visible width while retaining the nonzero floor", () => {
    const html = renderToStaticMarkup(
      <SplitBar
        items={[
          { label: "bulk", value: 999 },
          { label: "empty", value: 0 },
          { label: "trace", value: 1 },
        ]}
      />,
    );
    const rectFor = (label: string) =>
      html.match(new RegExp(`<rect[^>]*data-series="${label}"[^>]*>`))?.[0];
    expect(rectFor("empty")).toContain('width="0"');
    expect(
      Number(/width="([\d.]+)"/.exec(rectFor("trace") ?? "")?.[1]),
    ).toBeGreaterThanOrEqual(0.6);
  });
});
