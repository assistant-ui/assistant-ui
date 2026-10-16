import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotPlot } from "./dot-plot";

const rawAttribute = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];
const attribute = (tag: string, name: string) =>
  Number(rawAttribute(tag, name));
const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );

describe("DotPlot signed values", () => {
  it("places negative dots and ticks inside the plot", () => {
    const html = renderToStaticMarkup(
      <DotPlot
        items={[
          { label: "loss", value: -5 },
          { label: "gain", value: 10 },
        ]}
        ticks={[-10, 0, 10]}
      />,
    );
    const row = /<g[^>]*data-i="0"[^>]*>[\s\S]*?<\/g>/.exec(html)![0];
    const track = /<line[^>]*x2="[^"]+"[^>]*>/.exec(row)![0];
    const dot = /<circle[^>]*>/.exec(row)![0];
    const tick = /<line[^>]*data-part="grid"[^>]*>/.exec(html)![0];
    expect(attribute(dot, "cx")).toBeGreaterThanOrEqual(attribute(track, "x1"));
    expect(attribute(tick, "x1")).toBeGreaterThanOrEqual(
      attribute(track, "x1"),
    );
  });

  it("includes a negative tick when all dots are positive", () => {
    const html = renderToStaticMarkup(
      <DotPlot items={[{ label: "gain", value: 10 }]} ticks={[-10, 10]} />,
    );
    const row = /<g[^>]*data-i="0"[^>]*>[\s\S]*?<\/g>/.exec(html)![0];
    const track = /<line[^>]*x2="[^"]+"[^>]*>/.exec(row)![0];
    const tick = /<line[^>]*data-part="grid"[^>]*>/.exec(html)![0];
    expect(attribute(tick, "x1")).toBeGreaterThanOrEqual(
      attribute(track, "x1"),
    );
  });

  it("starts the non-negative domain at zero", () => {
    const html = renderToStaticMarkup(
      <DotPlot
        items={[
          { label: "a", value: 4 },
          { label: "b", value: 8 },
        ]}
        ticks={[0, 4, 8]}
      />,
    );
    const zeroTick = tags(html, "line").find(
      (tag) => rawAttribute(tag, "data-part") === "grid",
    )!;
    const track = tags(html, "line").find(
      (tag) => rawAttribute(tag, "data-part") === undefined,
    )!;
    expect(attribute(zeroTick, "x1")).toBe(attribute(track, "x1"));
    const dots = tags(html, "circle");
    expect(dots).toHaveLength(2);
    for (const dot of dots) {
      expect(attribute(dot, "cx")).toBeGreaterThan(attribute(track, "x1"));
    }
  });
});
