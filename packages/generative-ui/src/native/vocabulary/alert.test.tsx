// @vitest-environment jsdom
import { act, createElement } from "react";
import { AccessibilityInfo } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CARDS } from "../../vocabulary/carouselValues";
import { fade, RADIUS } from "../theme";
import {
  byRole,
  cleanupSpecs,
  press,
  renderElement,
  renderNativeSpec,
  spec,
} from "../testUtils";
import { alertVocabulary } from "./alert";

const observed = new Set<Element>();
let resized: ResizeObserverCallback;

class LayoutObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resized = callback;
  }
  observe(element: Element) {
    observed.add(element);
  }
  unobserve(element: Element) {
    observed.delete(element);
  }
  disconnect() {
    observed.clear();
  }
}

beforeEach(() => {
  observed.clear();
  vi.stubGlobal("ResizeObserver", LayoutObserver);
  vi.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
});

afterEach(() => {
  cleanupSpecs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const carouselSpec = (count: number, label = "Offers") =>
  spec({
    main: {
      type: "Carousel",
      props: { label },
      children: Array.from({ length: count }, (_, i) => `card${i}`),
    },
    ...Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        `card${i}`,
        { type: "Card", props: { title: `Card ${i + 1}` } },
      ]),
    ),
  });

const size = (element: Element, values: { width?: number; x?: number }) => {
  Object.defineProperty(element, "offsetWidth", {
    configurable: true,
    value: values.width ?? 0,
  });
  Object.defineProperty(element, "offsetLeft", {
    configurable: true,
    value: values.x ?? 0,
  });
};

async function layout(
  container: HTMLElement,
  viewport: number,
  slideWidth = 224,
) {
  const track = byRole(container, "region", "Offers");
  const slides = [...track.querySelectorAll<HTMLElement>('[role="group"]')];
  size(track, { width: viewport });
  slides.forEach((slide, index) =>
    size(slide, { width: slideWidth, x: index * (slideWidth + 12) }),
  );
  Object.defineProperty(track, "scrollWidth", {
    configurable: true,
    value: slides.length * (slideWidth + 12) - 12,
  });
  await act(async () => {
    resized(
      [...observed].map((target) => ({ target })) as ResizeObserverEntry[],
      {} as ResizeObserver,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return track;
}

describe("alert vocabulary on React Native", () => {
  it("pages a single wide card to its end and back", async () => {
    const { container } = renderNativeSpec(carouselSpec(1));
    const track = await layout(container, 200, 400);
    const scroll = vi.fn(({ left }: { left: number }) => {
      track.scrollLeft = left;
      track.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    Object.defineProperty(track, "scroll", {
      configurable: true,
      value: scroll,
    });
    await press(byRole(container, "button", "Next slide"));
    expect(scroll).toHaveBeenLastCalledWith({
      left: 200,
      top: 0,
      behavior: "smooth",
    });
    await press(byRole(container, "button", "Previous slide"));
    expect(scroll).toHaveBeenLastCalledWith({
      left: 0,
      top: 0,
      behavior: "smooth",
    });
  });

  it("does not rerender a slide on scroll within the same edges", async () => {
    const renderSlide = vi.fn(() => createElement("span", null, "Slide"));
    const container = renderElement(
      alertVocabulary.Carousel.render({
        label: "Offers",
        children: createElement(renderSlide),
      }),
    );
    const track = await layout(container, 100);
    await act(async () => {
      track.scrollLeft = 20;
      track.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    const renders = renderSlide.mock.calls.length;
    await act(async () => {
      track.scrollLeft = 30;
      track.dispatchEvent(new Event("scroll", { bubbles: true }));
      track.scrollLeft = 40;
      track.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(renderSlide).toHaveBeenCalledTimes(renders);
  });
  it.each([
    [undefined, "#171717"],
    ["info", "#171717"],
    ["success", "#2a984b"],
    ["warning", "#d58300"],
    ["danger", "#e7000b"],
  ] as const)("renders %s Alert tone and accessible content", (tone, color) => {
    const container = renderElement(
      createElement(
        "div",
        null,
        alertVocabulary.Alert.render({
          title: "Notice",
          description: "Details",
          tone,
          children: createElement("span", null, "More"),
        }),
      ),
    );
    const alert = byRole(container, "alert");
    expect(getComputedStyle(alert).borderWidth).toBe("1px");
    expect(getComputedStyle(alert).borderTopLeftRadius).toBe(
      `${RADIUS.surface}px`,
    );
    expect(getComputedStyle(alert).paddingTop).toBe("12px");
    expect(getComputedStyle(alert).paddingLeft).toBe("14px");
    expect(getComputedStyle(alert).borderTopColor).toBe(fade(color, 0.45));
    expect(getComputedStyle(alert).backgroundColor).toBe(fade(color, 0.08));
    expect(alert.textContent).toBe("NoticeDetailsMore");
    const title = alert.firstElementChild as HTMLElement;
    const description = title.nextElementSibling as HTMLElement;
    const titleStyle = getComputedStyle(title);
    const descriptionStyle = getComputedStyle(description);
    expect([
      titleStyle.fontSize,
      titleStyle.fontWeight,
      titleStyle.marginBottom,
    ]).toEqual(["14px", "500", "4px"]);
    expect([descriptionStyle.fontSize, descriptionStyle.color]).toEqual([
      "13px",
      fade("#0a0a0a", 0.62),
    ]);
  });

  it("caps and labels slides and frames a Card in each slide", () => {
    const { container } = renderNativeSpec(carouselSpec(MAX_CARDS + 2));
    const track = byRole(container, "region", "Offers");
    const slides = [...track.querySelectorAll<HTMLElement>('[role="group"]')];
    expect(slides).toHaveLength(MAX_CARDS);
    expect(slides.map((slide) => slide.getAttribute("aria-label"))).toEqual(
      Array.from({ length: MAX_CARDS }, (_, i) => `${i + 1} of ${MAX_CARDS}`),
    );
    expect(getComputedStyle(slides[0]!).minWidth).toBe("224px");
    const content = slides[0]!.parentElement!;
    expect(getComputedStyle(content).gap).toBe("12px");
    expect(getComputedStyle(content).paddingBottom).toBe("8px");
    const card = byRole(slides[0]!, "heading", "Card 1").parentElement!;
    expect(card.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(getComputedStyle(card).borderWidth).toBe("1px");
  });

  it("shows controls only when slides overflow and updates disabled ends while scrolling", async () => {
    const { container } = renderNativeSpec(carouselSpec(2));
    const track = await layout(container, 460);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
    await layout(container, 224);
    const previous = byRole(container, "button", "Previous slide");
    const next = byRole(container, "button", "Next slide");
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(next.getAttribute("aria-disabled")).not.toBe("true");
    const scroll = vi.fn(({ left }: { left: number }) => {
      track.scrollLeft = left;
      track.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    Object.defineProperty(track, "scroll", {
      configurable: true,
      value: scroll,
    });
    await press(next);
    expect(scroll).toHaveBeenLastCalledWith({
      left: 236,
      top: 0,
      behavior: "smooth",
    });
    expect(
      byRole(container, "button", "Next slide").getAttribute("aria-disabled"),
    ).toBe("true");
    await press(previous);
    expect(scroll).toHaveBeenLastCalledWith({
      left: 0,
      top: 0,
      behavior: "smooth",
    });
    await vi.waitFor(() =>
      expect(
        byRole(container, "button", "Previous slide").getAttribute(
          "aria-disabled",
        ),
      ).toBe("true"),
    );
  });

  it("does not animate after reduce motion changes", async () => {
    let changed: ((enabled: boolean) => void) | undefined;
    vi.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(
      (_, listener) => {
        changed = listener as (enabled: boolean) => void;
        return { remove: vi.fn() };
      },
    );
    const { container } = renderNativeSpec(carouselSpec(2));
    const track = await layout(container, 224);
    const scroll = vi.fn();
    Object.defineProperty(track, "scroll", {
      configurable: true,
      value: scroll,
    });
    await act(async () => changed?.(true));
    await press(byRole(container, "button", "Next slide"));
    expect(scroll).toHaveBeenLastCalledWith({
      left: 236,
      top: 0,
      behavior: "auto",
    });
  });

  it("reads reduce motion on mount", async () => {
    vi.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(
      true,
    );
    const { container } = renderNativeSpec(carouselSpec(2));
    const track = await layout(container, 224);
    const scroll = vi.fn();
    Object.defineProperty(track, "scroll", {
      configurable: true,
      value: scroll,
    });
    await press(byRole(container, "button", "Next slide"));
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledOnce();
    expect(scroll).toHaveBeenLastCalledWith({
      left: 236,
      top: 0,
      behavior: "auto",
    });
  });
});
