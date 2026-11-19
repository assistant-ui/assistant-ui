// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import * as generativeDemos from "@/components/demo/elements/generative-demos";
import { GENERATIVE_ELEMENTS } from "@/lib/generative-elements";
import { ELEMENT_DEMOS, generativeDemoName } from "./element-demos";
import { ELEMENTS } from "./registry";

const expectedKeys = ELEMENTS.flatMap((element) => [
  element.slug,
  ...(element.variants ?? []).map(
    (variant) => `${element.slug}/${variant.key}`,
  ),
]);

describe("element demos", () => {
  it("has a demo for every element and variant", () => {
    const missing = expectedKeys.filter((key) => !ELEMENT_DEMOS[key]);
    expect(missing).toEqual([]);
  });

  it("has no demo for an element or variant that is not in the registry", () => {
    const keys = new Set(expectedKeys);
    const stray = Object.keys(ELEMENT_DEMOS).filter((key) => !keys.has(key));
    expect(stray).toEqual([]);
  });

  it("names a real export for every generative demo", () => {
    const missing = GENERATIVE_ELEMENTS.map((entry) =>
      generativeDemoName(entry.templateSlug),
    ).filter((name) => !(name in generativeDemos));
    expect(missing).toEqual([]);
  });
});
