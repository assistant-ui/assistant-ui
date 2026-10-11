// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupSpecs,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

describe("Fact on React Native", () => {
  it.each([
    [
      "+8%",
      undefined,
      undefined,
      "↑ 8%",
      "rgb(42, 152, 75)",
      "rgba(42, 152, 75, 0.15)",
    ],
    [
      "-8%",
      undefined,
      undefined,
      "↓ 8%",
      "rgb(231, 0, 11)",
      "rgba(231, 0, 11, 0.15)",
    ],
    [
      "-8%",
      undefined,
      false,
      "↓ 8%",
      "rgb(42, 152, 75)",
      "rgba(42, 152, 75, 0.15)",
    ],
    [
      "+8%",
      undefined,
      false,
      "↑ 8%",
      "rgb(231, 0, 11)",
      "rgba(231, 0, 11, 0.15)",
    ],
    [
      "+0.0%",
      undefined,
      undefined,
      "→ +0.0%",
      "rgba(10, 10, 10, 0.62)",
      "rgb(245, 245, 245)",
    ],
    [
      "-8%",
      "up",
      undefined,
      "↑ -8%",
      "rgb(42, 152, 75)",
      "rgba(42, 152, 75, 0.15)",
    ],
  ] as const)(
    "renders the %s delta with trend %s and upIsGood %s",
    (delta, trend, upIsGood, text, color, background) => {
      const input = spec({
        main: {
          type: "Fact",
          props: { label: "Revenue", value: "$12k", delta, trend, upIsGood },
        },
      });
      const native = renderNativeSpec(input).container;
      const web = renderWebSpec(input).container;
      expect(native.textContent).toContain(
        web.querySelector('[data-aui="fact-label"]')!.textContent,
      );
      expect(native.textContent).toContain(
        web.querySelector('[data-aui="fact-value"]')!.textContent,
      );
      const chip = [...native.querySelectorAll<HTMLElement>("div")].find(
        (element) =>
          element.textContent === text && element.children.length === 0,
      )!;
      expect(chip).toBeDefined();
      expect(chip.style.color).toBe(color);
      if (background)
        expect(chip.parentElement!.style.backgroundColor).toBe(background);
    },
  );
});
