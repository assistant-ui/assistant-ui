import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorldMap } from "./index";

const fillOpacityOf = (html: string, iso: string) =>
  html
    .match(new RegExp(`<path[^>]*data-series="${iso}"[^>]*>`))?.[0]
    .match(/fill-opacity="([^"]+)"/)?.[1];

describe("WorldMap explicit max", () => {
  it("treats max={0} like an omitted max", () => {
    const values = { CN: 0, US: 0 };
    const omitted = renderToStaticMarkup(
      <WorldMap title="usage" values={values} />,
    );
    const zero = renderToStaticMarkup(
      <WorldMap title="usage" values={values} max={0} />,
    );

    expect(zero).not.toContain("NaN");
    for (const iso of Object.keys(values)) {
      expect(fillOpacityOf(zero, iso)).toBeDefined();
      expect(fillOpacityOf(zero, iso)).toBe(fillOpacityOf(omitted, iso));
    }
  });

  it("keeps a positive fractional max as the denominator", () => {
    const values = { US: 0.25 };
    const half = renderToStaticMarkup(
      <WorldMap title="usage" values={values} max={0.5} />,
    );
    const unit = renderToStaticMarkup(
      <WorldMap title="usage" values={values} max={1} />,
    );

    expect(fillOpacityOf(half, "US")).toBe("0.525");
    expect(fillOpacityOf(unit, "US")).toBe("0.313");
  });
});
