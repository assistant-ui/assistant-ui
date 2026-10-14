import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Area } from "./area";

const digest = async (markup: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markup)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
const fill = (markup: string) =>
  /<path d="([^"]+)"[^>]*data-part="mark"/.exec(markup)![1]!;
const baseline = (path: string) =>
  Number(/ L[\d.]+ ([\d.]+) Z$/.exec(path)![1]);

describe("Area signed values", () => {
  it("keeps negative points in the plot and fills to zero", () => {
    const html = renderToStaticMarkup(<Area data={[-5, 10]} />);
    const path = fill(html);
    const pointY = Number(/^M[\d.]+ ([\d.]+)/.exec(path)![1]);
    const bottom = 376;
    expect(pointY).toBeLessThanOrEqual(bottom);
    expect(baseline(path)).toBeLessThan(bottom);
  });

  it.each(["tick", "guide"])(
    "includes a negative %s in the domain",
    (source) => {
      const html = renderToStaticMarkup(
        <Area
          data={[5, 10]}
          {...(source === "tick"
            ? { yTicks: [{ at: -10, label: "-10" }] }
            : {})}
          {...(source === "guide" ? { guides: [{ at: -8 }] } : {})}
        />,
      );
      expect(baseline(fill(html))).toBeLessThan(376);
    },
  );

  it("keeps non-negative markup byte-identical", async () => {
    const html = renderToStaticMarkup(<Area data={[4, 8]} />);
    expect(await digest(html)).toBe(
      "113a1fecacb02912268e1f8aa8896688fced78fc97b79d2344b894e3b8a6da6b",
    );
  });
});
