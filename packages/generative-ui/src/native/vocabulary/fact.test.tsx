// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { toneTextColor } from "../theme";
import {
  cleanupSpecs,
  contrastRatio,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";

const scheme = vi.hoisted(() => ({ current: "light" as "light" | "dark" }));

vi.mock("react-native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-native")>()),
  useColorScheme: () => scheme.current,
}));

afterEach(() => {
  cleanupSpecs();
  scheme.current = "light";
});

describe("Fact on React Native", () => {
  it.each([
    [
      "+8%",
      undefined,
      undefined,
      "↑ 8%",
      "rgb(35, 90, 48)",
      "rgba(42, 152, 75, 0.15)",
    ],
    [
      "-8%",
      undefined,
      undefined,
      "↓ 8%",
      "rgb(134, 27, 22)",
      "rgba(231, 0, 11, 0.15)",
    ],
    [
      "-8%",
      undefined,
      false,
      "↓ 8%",
      "rgb(35, 90, 48)",
      "rgba(42, 152, 75, 0.15)",
    ],
    [
      "+8%",
      undefined,
      false,
      "↑ 8%",
      "rgb(134, 27, 22)",
      "rgba(231, 0, 11, 0.15)",
    ],
    [
      "+0.0%",
      undefined,
      undefined,
      "→ +0.0%",
      "rgb(23, 23, 23)",
      "rgb(245, 245, 245)",
    ],
    [
      "-8%",
      "up",
      undefined,
      "↑ -8%",
      "rgb(35, 90, 48)",
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
      expect(chip.textContent).toBe(
        web.querySelector('[data-aui="fact-delta"]')!.textContent,
      );
      expect(chip.style.color).toBe(color);
      if (background)
        expect(chip.parentElement!.style.backgroundColor).toBe(background);
    },
  );

  it.each(["light", "dark"] as const)(
    "keeps good and bad delta text above 4.5:1 in the %s theme",
    (mode) => {
      scheme.current = mode;
      const surfaces =
        mode === "light"
          ? ["rgb(255, 255, 255)"]
          : ["rgb(10, 10, 10)", "rgb(23, 23, 23)"];

      for (const [delta, text] of [
        ["+8%", "↑ 8%"],
        ["-8%", "↓ 8%"],
      ] as const) {
        const { container } = renderNativeSpec(
          spec({
            main: {
              type: "Fact",
              props: { label: "Revenue", value: "$12k", delta },
            },
          }),
        );
        const chip = [...container.querySelectorAll<HTMLElement>("div")].find(
          (element) =>
            element.textContent === text && element.children.length === 0,
        )!;
        const tint = chip.parentElement!.style.backgroundColor;
        for (const surface of surfaces)
          expect(
            contrastRatio(chip.style.color, tint, surface),
          ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("derives native tone text with the same Oklab mix as the web", () => {
    expect(toneTextColor("#2a984b", "#0a0a0a")).toBe("rgb(35, 90, 48)");
  });
});
