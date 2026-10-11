// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupSpecs,
  renderElement,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";
import { mediaVocabulary } from "./media";

afterEach(cleanupSpecs);

describe("media vocabulary on React Native", () => {
  it.each([
    ["sm", 128, false],
    ["md", 256, false],
    ["lg", 384, false],
    [128, 128, false],
    ["sm", 32, true],
    ["md", 40, true],
    ["lg", 52, true],
    [64, 64, true],
  ] as const)(
    "sizes an image at %s to %s points with round %s",
    (size, expected, round) => {
      const input = spec({
        main: {
          type: "Image",
          props: { src: "https://example.com/a.png", alt: "A", size, round },
        },
      });
      const native = renderNativeSpec(input).container.querySelector("img")!;
      const web = renderWebSpec(input).container.querySelector("img")!;
      expect(native.getAttribute("src")).toBe(web.getAttribute("src"));
      const surface = native.parentElement!;
      expect(surface.style.maxWidth || surface.style.width).toBe(
        `${expected}px`,
      );
      if (round) {
        expect(surface.style.width).toBe(`${expected}px`);
        expect(surface.style.height).toBe(`${expected}px`);
        expect(getComputedStyle(surface).borderTopLeftRadius).toBe("9999px");
      } else {
        expect(getComputedStyle(surface).borderTopLeftRadius).toBe("8px");
      }
    },
  );

  it("labels an image and hides one without alt", () => {
    const labeled = renderNativeSpec(
      spec({
        main: {
          type: "Image",
          props: { src: "https://example.com/a.png", alt: "Portrait" },
        },
      }),
    ).container.querySelector("img")!;
    expect(labeled.parentElement!.getAttribute("aria-label")).toBe("Portrait");
    expect(labeled.parentElement!.getAttribute("aria-hidden")).not.toBe("true");
    const hidden = renderElement(
      <>
        {mediaVocabulary.Image.render({
          src: "https://example.com/b.png",
        } as never)}
      </>,
    ).firstElementChild!;
    expect(hidden.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws a hairline divider", () => {
    const divider = renderNativeSpec(spec({ main: { type: "Divider" } }))
      .container.firstElementChild as HTMLElement;
    expect(getComputedStyle(divider).height).toBe("1px");
    expect(divider.style.backgroundColor).toBe("rgba(229, 229, 229, 0.6)");
  });
});
