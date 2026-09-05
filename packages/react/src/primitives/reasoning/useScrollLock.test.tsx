// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollLock } from "./useScrollLock";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  document.body.replaceChildren();
});

/** jsdom reports zero for every box, so the widths a real browser would measure
 * are stubbed on the element under test. */
function stubWidths(
  element: HTMLElement,
  { offsetWidth, clientWidth }: { offsetWidth: number; clientWidth: number },
) {
  Object.defineProperty(element, "offsetWidth", {
    configurable: true,
    value: offsetWidth,
  });
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: clientWidth,
  });
}

function lockWithin(container: HTMLElement) {
  const animated = document.createElement("div");
  container.appendChild(animated);
  const ref = { current: animated };
  const { result } = renderHook(() => useScrollLock(ref, 200));
  return result.current;
}

describe("useScrollLock", () => {
  it("compensates for the scrollbar it hides on an element scroller", () => {
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    scroller.style.borderWidth = "0px";
    scroller.style.paddingRight = "4px";
    document.body.appendChild(scroller);
    stubWidths(scroller, { offsetWidth: 306, clientWidth: 300 });

    lockWithin(scroller)();

    expect(scroller.style.scrollbarWidth).toBe("none");
    expect(scroller.style.paddingRight).toBe("10px");
  });

  // The root element's offsetWidth already excludes the viewport scrollbar, so
  // the element formula reports zero for it; without this the page's centered
  // content shifts sideways for the length of the animation.
  it("compensates when the scroller is the root element", () => {
    const root = document.documentElement;
    root.style.overflowY = "auto";
    stubWidths(root, { offsetWidth: 1599, clientWidth: 1599 });
    vi.stubGlobal("innerWidth", 1605);

    lockWithin(document.body)();

    expect(root.style.scrollbarWidth).toBe("none");
    expect(root.style.paddingRight).toBe("6px");
  });

  // With `html { overflow: hidden }` the body scrolls on its own, so the
  // viewport measure reports nothing and only the element formula sees the bar.
  it("compensates when the body is the scroller rather than the viewport", () => {
    const root = document.documentElement;
    stubWidths(root, { offsetWidth: 1600, clientWidth: 1600 });
    vi.stubGlobal("innerWidth", 1600);
    const body = document.body;
    body.style.overflowY = "auto";
    body.style.borderWidth = "0px";
    stubWidths(body, { offsetWidth: 1606, clientWidth: 1600 });

    lockWithin(body)();

    expect(body.style.paddingRight).toBe("6px");
  });

  // Both can scroll at once, and the padding lands on the body, so it is the
  // body's own gutter that has to be replaced rather than the viewport's.
  it("pads a scrolling body by its own gutter, not the viewport's", () => {
    const root = document.documentElement;
    stubWidths(root, { offsetWidth: 1585, clientWidth: 1585 });
    vi.stubGlobal("innerWidth", 1600);
    const body = document.body;
    body.style.overflowY = "auto";
    body.style.borderWidth = "0px";
    stubWidths(body, { offsetWidth: 1591, clientWidth: 1585 });

    lockWithin(body)();

    expect(body.style.paddingRight).toBe("6px");
  });

  it("restores the padding it added once the animation is over", () => {
    vi.useFakeTimers();
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    scroller.style.borderWidth = "0px";
    document.body.appendChild(scroller);
    stubWidths(scroller, { offsetWidth: 306, clientWidth: 300 });

    lockWithin(scroller)();
    expect(scroller.style.paddingRight).toBe("6px");

    vi.advanceTimersByTime(200);

    expect(scroller.style.paddingRight).toBe("");
    expect(scroller.style.scrollbarWidth).toBe("");
  });

  it("leaves the padding alone when no scrollbar takes space", () => {
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    scroller.style.borderWidth = "0px";
    document.body.appendChild(scroller);
    stubWidths(scroller, { offsetWidth: 300, clientWidth: 300 });

    lockWithin(scroller)();

    expect(scroller.style.paddingRight).toBe("");
  });
});
