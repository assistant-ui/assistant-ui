import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Icicle } from "./icicle";

describe("Icicle branch ordinals", () => {
  it("keeps branch colors and sibling opacity across nested branches", () => {
    const root = {
      label: "root",
      children: [
        {
          label: "alpha",
          children: [
            {
              label: "alpha-one",
              children: [
                { label: "alpha-one-a", value: 1 },
                { label: "alpha-one-b", value: 1 },
              ],
            },
            { label: "alpha-two", value: 1 },
          ],
        },
        {
          label: "beta",
          children: [
            { label: "beta-one", value: 1 },
            {
              label: "beta-two",
              children: [
                { label: "beta-two-a", value: 1 },
                { label: "beta-two-b", value: 1 },
                { label: "beta-two-c", value: 1 },
              ],
            },
            { label: "beta-three", value: 1 },
          ],
        },
        { label: "gamma", children: [{ label: "gamma-one", value: 1 }] },
      ],
    };
    const html = renderToStaticMarkup(<Icicle root={root} depth={3} />);
    const marks = Array.from(
      html.matchAll(
        /<g data-part="mark" data-series="([^"]+)"><rect [^>]*fill="([^"]+)"(?: opacity="([^"]+)")?/g,
      ),
      ([, label, fill, opacity]) => [label, fill, opacity ?? null],
    );

    expect(marks).toEqual([
      [
        "root",
        "color-mix(in oklab, var(--dg-ink, currentColor) 8%, transparent)",
        null,
      ],
      ["alpha", "var(--dg-c1, #3b82f6)", "0.85"],
      ["alpha-one", "var(--dg-c1, #3b82f6)", "0.55"],
      ["alpha-one-a", "var(--dg-c1, #3b82f6)", "0.55"],
      ["alpha-one-b", "var(--dg-c1, #3b82f6)", "0.35"],
      ["alpha-two", "var(--dg-c1, #3b82f6)", "0.35"],
      ["beta", "var(--dg-c2, #059669)", "0.85"],
      ["beta-one", "var(--dg-c2, #059669)", "0.55"],
      ["beta-two", "var(--dg-c2, #059669)", "0.35"],
      ["beta-two-a", "var(--dg-c2, #059669)", "0.55"],
      ["beta-two-b", "var(--dg-c2, #059669)", "0.35"],
      ["beta-two-c", "var(--dg-c2, #059669)", "0.55"],
      ["beta-three", "var(--dg-c2, #059669)", "0.55"],
      ["gamma", "var(--dg-c3, #8b5cf6)", "0.85"],
      ["gamma-one", "var(--dg-c3, #8b5cf6)", "0.55"],
    ]);
  });
});
