import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Column } from "./column";

const attribute = (tag: string, name: string) =>
  Number(new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]);
const digest = async (markup: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markup)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

describe("Column signed values", () => {
  it("draws a negative column inside the plot from zero", () => {
    const html = renderToStaticMarkup(
      <Column
        items={[
          { label: "gain", value: 10 },
          { label: "loss", value: -5 },
        ]}
      />,
    );
    const hit = /<rect[^>]*fill="transparent"[^>]*data-part="mark"/.exec(
      html,
    )![0];
    const bottom = attribute(hit, "y") + attribute(hit, "height");
    const mark = /<g[^>]*data-i="1"[^>]*><rect[^>]+/.exec(html)![0];
    const rect = /<rect[^>]+/.exec(mark)![0];
    expect(attribute(rect, "height")).toBeGreaterThan(0);
    expect(
      attribute(rect, "y") + attribute(rect, "height"),
    ).toBeLessThanOrEqual(bottom);
  });

  it.each(["tick", "guide"])(
    "includes a negative %s in the linear domain",
    (source) => {
      const html = renderToStaticMarkup(
        <Column
          items={[{ label: "gain", value: 5 }]}
          {...(source === "tick"
            ? { yTicks: [{ at: -10, label: "-10" }] }
            : {})}
          {...(source === "guide" ? { guides: [{ at: -8 }] } : {})}
        />,
      );
      const hit = /<rect[^>]*fill="transparent"[^>]*data-part="mark"/.exec(
        html,
      )![0];
      const bottom = attribute(hit, "y") + attribute(hit, "height");
      const mark = /<g[^>]*data-i="0"[^>]*><rect[^>]+/.exec(html)![0];
      const rect = /<rect[^>]+/.exec(mark)![0];
      expect(attribute(rect, "y") + attribute(rect, "height")).toBeLessThan(
        bottom,
      );
    },
  );

  it("keeps non-negative markup byte-identical", async () => {
    const html = renderToStaticMarkup(
      <Column
        items={[
          { label: "a", value: 4 },
          { label: "b", value: 8 },
        ]}
      />,
    );
    expect(await digest(html)).toBe(
      "f00a2e7f7cf07a2346520e0e665d0bff11893034a6177c5efeed428989e470b3",
    );
  });
});
