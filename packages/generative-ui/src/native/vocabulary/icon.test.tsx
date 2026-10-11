// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ICON_NAMES } from "../../ir";
import { cleanupSpecs, renderNativeSpec, spec } from "../testUtils";

afterEach(cleanupSpecs);

describe("icon vocabulary on React Native", () => {
  it("draws every icon as one hidden character at its size", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Row",
          props: {},
          children: ICON_NAMES.map((name) => name),
        },
        ...Object.fromEntries(
          ICON_NAMES.map((name) => [
            name,
            { type: "Icon", props: { name, size: "lg" } },
          ]),
        ),
      }),
    );
    const glyphs = [
      ...(container.firstElementChild as HTMLElement).children,
    ] as HTMLElement[];
    expect(glyphs).toHaveLength(ICON_NAMES.length);
    for (const glyph of glyphs) {
      expect(glyph.getAttribute("aria-hidden")).toBe("true");
      expect(glyph.style.fontSize).toBe("20px");
      expect([...glyph.textContent!.replace("︎", "")]).toHaveLength(1);
    }
  });
});
