// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
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

const textIn = (container: HTMLElement, content: string) =>
  [...container.querySelectorAll<HTMLElement>("div")].find(
    (element) =>
      element.textContent === content && element.children.length === 0,
  )!;

describe("Fact on React Native", () => {
  it("labels a fact in sentence case and sets facts side by side as headline figures, quieter inside a card", () => {
    const fact = (value: string) => ({
      type: "Fact",
      props: { label: "Total distance", value },
    });
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Col", children: ["figures", "plain", "card"] },
        figures: { type: "Row", children: ["headline"] },
        headline: fact("455 mi"),
        plain: fact("3 nights"),
        card: {
          type: "Card",
          props: { title: "Day 1" },
          children: ["cardRow"],
        },
        cardRow: { type: "Row", children: ["detail"] },
        detail: fact("125 mi"),
      }),
    );
    const label = getComputedStyle(textIn(container, "Total distance"));
    expect([label.fontSize, label.textTransform]).toEqual(["12px", "none"]);
    const size = (content: string) => {
      const style = getComputedStyle(textIn(container, content));
      return [style.fontSize, style.fontWeight];
    };
    expect(size("455 mi")).toEqual(["20px", "600"]);
    expect(size("3 nights")[0]).toBe("14px");
    expect(size("125 mi")).toEqual(["15px", "500"]);
  });

  it("keeps a fact inside a Row's Tabs or Box at body size", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Row", children: ["tabs", "box"] },
        tabs: {
          type: "Tabs",
          props: { tabs: ["Route"] },
          children: ["inTabs"],
        },
        inTabs: { type: "Fact", props: { label: "Distance", value: "455 mi" } },
        box: { type: "Box", children: ["inBox"] },
        inBox: { type: "Fact", props: { label: "Stay", value: "3 nights" } },
      }),
    );
    for (const value of ["455 mi", "3 nights"]) {
      expect(getComputedStyle(textIn(container, value)).fontSize).toBe("14px");
    }
  });

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
});
