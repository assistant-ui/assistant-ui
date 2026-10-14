import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProgressRing } from "./progress-ring";

describe("ProgressRing at small widths", () => {
  it.each([100, 48, 40])("keeps the %ipx ring inside the frame", (width) => {
    const html = renderToStaticMarkup(
      <ProgressRing value={0.82} width={width} label="ship" />,
    );
    const height = Number(/<svg[^>]* height="([^"]+)"/.exec(html)?.[1]);
    const circle = /<circle[^>]*>/.exec(html);
    const arc = /<path[^>]*data-part="mark"[^>]*>/.exec(html);
    expect(circle).not.toBeNull();
    expect(arc).not.toBeNull();
    const attribute = (name: string) =>
      Number(new RegExp(`${name}="([-\\d.]+)"`).exec(circle![0])?.[1]);
    const cx = attribute("cx");
    const cy = attribute("cy");
    const radius = attribute("r");
    const stroke = attribute("stroke-width");
    const arcRadius = Number(/ A([-\d.]+)/.exec(arc![0])?.[1]);
    const arcStroke = Number(/stroke-width="([-\d.]+)"/.exec(arc![0])?.[1]);
    expect(radius).toBeGreaterThan(0);
    expect(arcRadius).toBeGreaterThan(0);
    expect(stroke).toBeGreaterThan(0);
    expect(arcStroke).toBeGreaterThan(0);
    expect(cx - radius - stroke / 2).toBeGreaterThanOrEqual(0);
    expect(cx + radius + stroke / 2).toBeLessThanOrEqual(width);
    expect(cy - radius - stroke / 2).toBeGreaterThanOrEqual(0);
    expect(cy + radius + stroke / 2).toBeLessThanOrEqual(height);
    expect(html).not.toContain(">ship</text>");
  });

  it("retains the label at the default width", () => {
    const html = renderToStaticMarkup(
      <ProgressRing value={0.82} label="ship" />,
    );
    expect(html).toContain(">ship</text>");
  });
});
