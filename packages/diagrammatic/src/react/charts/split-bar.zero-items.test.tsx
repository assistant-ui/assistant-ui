import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SplitBar } from "./split-bar";

describe("SplitBar zero items", () => {
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
