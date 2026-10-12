// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanupSpecs, renderVueSpec, spec } from "../testUtils";

afterEach(cleanupSpecs);

describe("numeric zero in text props in Vue", () => {
  it.each([
    [
      "Card title",
      "Card",
      { title: 0 },
      '<header data-aui="card-title">0</header>',
    ],
    [
      "Alert title",
      "Alert",
      { title: 0 },
      '<header data-aui="alert-title">0</header>',
    ],
    [
      "Alert description",
      "Alert",
      { description: 0 },
      '<p data-aui="alert-desc">0</p>',
    ],
    [
      "Select placeholder",
      "Select",
      { options: [{ label: "A", value: "a" }], placeholder: 0 },
      '<option disabled="" selected="" value="">0</option>',
    ],
  ])("renders a zero %s", (_name, type, props, expected) => {
    const { markup } = renderVueSpec(spec({ main: { type, props } }));
    expect(markup()).toContain(expected);
  });
});
