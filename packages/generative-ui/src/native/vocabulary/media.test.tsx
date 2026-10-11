// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  renderElement,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";
import { mediaVocabulary } from "./media";

afterEach(() => {
  cleanupSpecs();
  vi.unstubAllGlobals();
});

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
    const labeled = byRole(
      renderNativeSpec(
        spec({
          main: {
            type: "Image",
            props: { src: "https://example.com/a.png", alt: "Portrait" },
          },
        }),
      ).container,
      "img",
      "Portrait",
    );
    expect(labeled.querySelector("img")).not.toBeNull();
    expect(labeled.getAttribute("aria-hidden")).not.toBe("true");
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

  it("resets a measured ratio when the image source changes", async () => {
    const loads: MockImage[] = [];
    class MockImage {
      onload?: (event: { source: { width: number; height: number } }) => void;
      uri = "";
      set src(value: string) {
        this.uri = value;
        loads.push(this);
      }
    }
    vi.stubGlobal("Image", MockImage);
    const view = (src: string) =>
      spec({ main: { type: "Image", props: { src, alt: "Photo" } } });
    const rendered = renderNativeSpec(view("https://example.com/a.png"));
    const first = rendered.container.querySelector("img")!;
    await act(async () => {
      loads
        .find((image) => image.uri.endsWith("a.png"))!
        .onload?.({
          source: { width: 200, height: 100 },
        });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(getComputedStyle(first.parentElement!).aspectRatio).toBe("2 / 1");
    await rendered.update(view("https://example.com/b.png"));
    expect(
      getComputedStyle(rendered.container.querySelector("img")!.parentElement!)
        .aspectRatio,
    ).toBe("1 / 1");
    await act(async () => {
      loads
        .find((image) => image.uri.endsWith("b.png"))!
        .onload?.({
          source: { width: 200, height: 100 },
        });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      getComputedStyle(rendered.container.querySelector("img")!.parentElement!)
        .aspectRatio,
    ).toBe("2 / 1");
  });
});
