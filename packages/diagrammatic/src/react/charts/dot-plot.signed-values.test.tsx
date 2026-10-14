import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotPlot } from "./dot-plot";

const attribute = (tag: string, name: string) =>
  Number(new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]);
const digest = async (markup: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markup)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

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

  it("keeps non-negative markup byte-identical", async () => {
    const html = renderToStaticMarkup(
      <DotPlot
        items={[
          { label: "a", value: 4 },
          { label: "b", value: 8 },
        ]}
        ticks={[0, 4, 8]}
      />,
    );
    expect(await digest(html)).toBe(
      "331c524ddfd9e0f42f6f35ba9842657e13b0d6edcf1aaab377f2da2a91e959be",
    );
  });
});
