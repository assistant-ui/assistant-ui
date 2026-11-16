// @vitest-environment jsdom
import { act } from "react";
import { Linking } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  renderElement,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";
import { mediaVocabulary } from "./media";
import { renderGenerativeUI } from "../../renderGenerativeUI";

const scheme = vi.hoisted(() => ({ current: "light" as "light" | "dark" }));

vi.mock("react-native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-native")>()),
  useColorScheme: () => scheme.current,
}));

afterEach(() => {
  cleanupSpecs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  scheme.current = "light";
});

describe("media vocabulary on React Native", () => {
  it("loads only listed origins and data images when imageOrigins is set", () => {
    const render = (src: string) =>
      renderElement(
        <>
          {renderGenerativeUI(
            { $type: "Image", src, alt: "Portrait" },
            mediaVocabulary,
            {
              status: "done",
              imageOrigins: ["https://cdn.example.com"],
            },
          )}
        </>,
      );
    expect(
      render("https://cdn.example.com/a.png").querySelector("img"),
    ).not.toBeNull();
    expect(
      render("data:image/png;base64,YQ==").querySelector("img"),
    ).not.toBeNull();
    const blocked = render("https://other.example.com/a.png");
    expect(blocked.querySelector("img")).toBeNull();
    expect(blocked.textContent).toBe("Portrait");
  });

  it("writes a blocked image's alt text in the theme's ink", () => {
    scheme.current = "dark";
    const blocked = renderElement(
      <>
        {renderGenerativeUI(
          {
            $type: "Image",
            src: "https://other.example.com/a.png",
            alt: "Portrait",
          },
          mediaVocabulary,
          { status: "done", imageOrigins: ["https://cdn.example.com"] },
        )}
      </>,
    );
    const alt = [...blocked.querySelectorAll<HTMLElement>("div")].find(
      (element) =>
        element.textContent === "Portrait" && element.children.length === 0,
    )!;
    expect(getComputedStyle(alt).color).toBe("rgb(250, 250, 250)");
  });

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

  it("uses Diagram text and Map details to name a bound row", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["diagram", "map"],
          on: { press: { action: "open" } },
        },
        diagram: {
          type: "Diagram",
          props: { code: "flowchart LR", title: "Order flow" },
        },
        map: {
          type: "Map",
          props: {
            places: [
              { label: "Monterey", lat: 36.6, lng: -121.9, detail: "Night 1" },
            ],
          },
        },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(container, "button", "flowchart LR, Order flow, Night 1"),
    ).toBeTruthy();
    expect(byRole(container, "link", "Monterey")).toBeTruthy();
  });

  it("shows Diagram Mermaid source and its caption", () => {
    const input = spec({
      main: {
        type: "Diagram",
        props: {
          code: "flowchart LR\n  A[Order] --> B[Ship]",
          title: "Order flow",
        },
      },
    });
    const native = renderNativeSpec(input).container;
    const web = renderWebSpec(input).container;
    expect(native.textContent).toBe(web.textContent);
    expect(native.textContent).toBe(
      "flowchart LR\n  A[Order] --> B[Ship]Order flow",
    );
    const source = [
      ...native.querySelectorAll<HTMLElement>('div[dir="auto"]'),
    ].find(
      (element) =>
        element.textContent === "flowchart LR\n  A[Order] --> B[Ship]",
    );
    expect(getComputedStyle(source!).fontFamily).toContain("monospace");
    expect(
      getComputedStyle(source!.parentElement!.parentElement!).overflowX,
    ).toBe("auto");
  });

  it("shows Diagram source without adding a caption when title is absent", () => {
    const native = renderNativeSpec(
      spec({ main: { type: "Diagram", props: { code: "flowchart TD" } } }),
    ).container;
    expect(native.textContent).toBe("flowchart TD");
  });

  it("lists valid Map places in order, with details under their links", async () => {
    const openURL = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const input = spec({
      main: {
        type: "Map",
        props: {
          route: true,
          places: [
            {
              label: "Monterey",
              lat: 36.6002,
              lng: -121.8947,
              detail: "Night 1",
            },
            { label: "Nowhere", lat: 120, lng: 0 },
            { label: "Big Sur", lat: 36.2704, lng: -121.8081 },
          ],
        },
      },
    });
    const native = renderNativeSpec(input).container;
    const web = renderWebSpec(input).container;
    const list = byRole(native, "list");
    const links = [...list.querySelectorAll<HTMLElement>('[role="link"]')];
    expect(links.map((link) => link.textContent)).toEqual([
      "Monterey",
      "Big Sur",
    ]);
    expect(list.textContent).toBe(web.textContent);
    expect(list.textContent).toBe("MontereyNight 1Big Sur");
    expect(byRole(native, "link", "Monterey").parentElement!.textContent).toBe(
      "MontereyNight 1",
    );
    try {
      await press(byRole(native, "link", "Monterey"));
      expect(openURL).toHaveBeenCalledExactlyOnceWith(
        "https://www.openstreetmap.org/?mlat=36.6002&mlon=-121.8947#map=14/36.6002/-121.8947",
      );
    } finally {
      openURL.mockRestore();
    }
  });

  it("swallows a Map link no app can open", async () => {
    const openURL = vi
      .spyOn(Linking, "openURL")
      .mockRejectedValue(new Error("No app handles this URL"));
    try {
      const native = renderNativeSpec(
        spec({
          main: {
            type: "Map",
            props: { places: [{ label: "Monterey", lat: 36.6, lng: -121.9 }] },
          },
        }),
      ).container;
      await press(byRole(native, "link", "Monterey"));
      await Promise.resolve();
      expect(openURL).toHaveBeenCalledOnce();
    } finally {
      openURL.mockRestore();
    }
  });

  it("lays out images directly in a Row as 4:3 tiles that share the width, and a sm image as a thumbnail", () => {
    const image = (src: string, size?: string) => ({
      type: "Image",
      props: { src: `https://example.com/${src}.png`, alt: src, size },
    });
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Col", children: ["row", "alone"] },
        row: { type: "Row", children: ["a", "b", "thumb", "box"] },
        a: image("a", "md"),
        b: image("b"),
        thumb: image("thumb", "sm"),
        box: { type: "Box", children: ["boxed"] },
        boxed: image("boxed"),
        alone: image("alone"),
      }),
    );
    const [a, b, thumb, boxed, alone] = [
      ...container.querySelectorAll("img"),
    ].map((img) => img.parentElement!);
    for (const tile of [a!, b!]) {
      expect(getComputedStyle(tile).flexGrow).toBe("1");
      expect(getComputedStyle(tile).aspectRatio).toBe(
        getComputedStyle(a!).aspectRatio,
      );
      expect(tile.style.width).toBe("");
    }
    expect(Number.parseFloat(getComputedStyle(a!).aspectRatio)).toBeCloseTo(
      4 / 3,
    );
    expect(a!.style.maxWidth).toBe("256px");
    expect([thumb!.style.width, thumb!.style.height]).toEqual(["72px", "72px"]);
    expect(boxed!.style.width).toBe("100%");
    expect(alone!.style.width).toBe("100%");
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
