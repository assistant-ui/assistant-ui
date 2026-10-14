// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Spec } from "generative-frame/spec";
import { nextTick } from "vue";
import {
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

const slides = (count: number, label?: string): Spec["elements"] => ({
  main: {
    type: "Carousel",
    props: label ? { label } : {},
    children: Array.from({ length: count }, (_, index) => `slide${index}`),
  },
  ...Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `slide${index}`,
      { type: "Text", props: { value: `card ${index}` } },
    ]),
  ),
});

describe("alert vocabulary in Vue", () => {
  it.each([
    ["title", '<header data-aui="alert-title">0</header>'],
    ["description", '<p data-aui="alert-desc">0</p>'],
  ] as const)("renders a zero Alert %s", (prop, expected) => {
    const { markup } = renderVueSpec(
      spec({ main: { type: "Alert", props: { [prop]: 0 } } }),
    );
    expect(markup()).toContain(expected);
  });

  it.each<[string, Spec["elements"]]>([
    [
      "an alert with invalid text",
      {
        main: {
          type: "Alert",
          props: {
            title: { unexpected: true },
            description: { unexpected: true },
          },
        },
      },
    ],
    [
      "a default alert",
      {
        main: {
          type: "Alert",
          props: { title: "Heads up", description: "Something happened" },
        },
      },
    ],
    [
      "a danger alert",
      { main: { type: "Alert", props: { title: "Error", tone: "danger" } } },
    ],
    [
      "an alert with children",
      {
        main: { type: "Alert", children: ["detail"] },
        detail: { type: "Caption", props: { value: "Details" } },
      },
    ],
    ["a carousel without a label", slides(0)],
    ["a labeled carousel", slides(3, "Featured")],
    ["a single slide", slides(1)],
    ["a carousel capped at ten slides", slides(12)],
  ])("renders %s like React", (_name, elements) => {
    expect(renderVueSpec(spec(elements)).markup()).toBe(
      renderReactSpec(spec(elements)).markup(),
    );
  });

  it("renders two carousels with distinct IDs like React", () => {
    const elements: Spec["elements"] = {
      main: { type: "Alert", children: ["first", "second"] },
      first: { type: "Carousel", children: ["a"] },
      second: { type: "Carousel", children: ["b"] },
      a: { type: "Text", props: { value: "a" } },
      b: { type: "Text", props: { value: "b" } },
    };
    expect(renderVueSpec(spec(elements)).markup()).toBe(
      renderReactSpec(spec(elements)).markup(),
    );
  });

  it("renders and moves overflow controls like React", async () => {
    const tree = spec(slides(3, "Featured"));
    const react = renderReactSpec(tree);
    const vue = renderVueSpec(tree);
    const setLayout = (container: HTMLElement) => {
      const track = container.querySelector<HTMLElement>(
        '[data-aui="carousel"]',
      )!;
      const rect = (left: number) => ({ left, right: left + 188 }) as DOMRect;
      Object.defineProperties(track, {
        scrollWidth: { configurable: true, value: 600 },
        clientWidth: { configurable: true, value: 300 },
        scrollLeft: { configurable: true, value: 0, writable: true },
        getBoundingClientRect: { configurable: true, value: () => rect(140) },
      });
      track
        .querySelectorAll(':scope > [data-aui="carousel-slide"]')
        .forEach((slide, index) => {
          Object.defineProperty(slide, "getBoundingClientRect", {
            configurable: true,
            value: () => rect(140 + index * 200),
          });
        });
      const scrollBy = vi.fn();
      Object.defineProperty(track, "scrollBy", {
        configurable: true,
        value: scrollBy,
      });
      return { track, scrollBy };
    };
    const reactLayout = setLayout(react.container);
    const vueLayout = setLayout(vue.container);
    await act(async () => window.dispatchEvent(new Event("resize")));
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
    await act(async () =>
      react.container
        .querySelector<HTMLButtonElement>('[data-aui="carousel-next"]')!
        .click(),
    );
    vue.container
      .querySelector<HTMLButtonElement>('[data-aui="carousel-next"]')!
      .click();
    await nextTick();
    expect(vueLayout.scrollBy.mock.calls).toEqual(
      reactLayout.scrollBy.mock.calls,
    );
    reactLayout.track.scrollLeft = 300;
    vueLayout.track.scrollLeft = 300;
    await act(async () => reactLayout.track.dispatchEvent(new Event("scroll")));
    vueLayout.track.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(vue.markup()).toBe(react.markup());
  });

  it("moves without Element.scrollBy like React", async () => {
    const tree = spec(slides(3));
    const react = renderReactSpec(tree);
    const vue = renderVueSpec(tree);
    const tracks = [react.container, vue.container].map((container) => {
      const track = container.querySelector<HTMLElement>(
        '[data-aui="carousel"]',
      )!;
      Object.defineProperties(track, {
        scrollWidth: { configurable: true, value: 600 },
        clientWidth: { configurable: true, value: 300 },
        scrollLeft: { configurable: true, value: 0, writable: true },
        getBoundingClientRect: {
          configurable: true,
          value: () => ({ left: 140, right: 328 }) as DOMRect,
        },
      });
      track
        .querySelectorAll(':scope > [data-aui="carousel-slide"]')
        .forEach((slide, index) => {
          Object.defineProperty(slide, "getBoundingClientRect", {
            configurable: true,
            value: () =>
              ({
                left: 140 + index * 200,
                right: 328 + index * 200,
              }) as DOMRect,
          });
        });
      return track;
    });
    await act(async () => window.dispatchEvent(new Event("resize")));
    await nextTick();
    await act(async () =>
      react.container
        .querySelector<HTMLButtonElement>('[data-aui="carousel-next"]')!
        .click(),
    );
    vue.container
      .querySelector<HTMLButtonElement>('[data-aui="carousel-next"]')!
      .click();
    await nextTick();
    expect(tracks.map((track) => track.scrollLeft)).toEqual([200, 200]);
  });
});
