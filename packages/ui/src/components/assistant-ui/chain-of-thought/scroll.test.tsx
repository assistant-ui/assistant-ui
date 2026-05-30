/**
 * @vitest-environment jsdom
 */
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { useAutoScroll, type UseAutoScrollOptions } from "./scroll";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

function Probe(opts: UseAutoScrollOptions) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const { isScrolledUp, scrollToBottom } = useAutoScroll(el, 0, opts);
  return createElement("div", null, [
    createElement("div", { key: "s", ref: setEl, "data-slot": "scroller" }),
    createElement(
      "span",
      { key: "p", "data-slot": "pinned" },
      String(isScrolledUp),
    ),
    createElement("button", {
      key: "j",
      type: "button",
      "data-slot": "jump",
      onClick: scrollToBottom,
    }),
  ]);
}

const setup = (opts: UseAutoScrollOptions) => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(createElement(Probe, opts)));

  const scroller = container.querySelector(
    "[data-slot=scroller]",
  ) as HTMLDivElement;
  let top = 0;
  Object.defineProperty(scroller, "scrollHeight", {
    configurable: true,
    get: () => 1000,
  });
  Object.defineProperty(scroller, "clientHeight", {
    configurable: true,
    get: () => 100,
  });
  Object.defineProperty(scroller, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      top = v;
    },
  });

  const scrollToPos = (v: number) =>
    act(() => {
      top = v;
      scroller.dispatchEvent(new Event("scroll"));
    });
  const pinned = () =>
    container.querySelector("[data-slot=pinned]")?.textContent;
  const clickJump = () =>
    act(() => {
      (
        container.querySelector("[data-slot=jump]") as HTMLButtonElement
      ).click();
    });

  return {
    scrollToPos,
    pinned,
    clickJump,
    getTop: () => top,
    unmount: () => act(() => root.unmount()),
  };
};

describe("useAutoScroll", () => {
  it("never treats a downward (programmatic) scroll as a user scroll-up", () => {
    const view = setup({ track: true });
    // Simulate an in-flight programmatic pin: scrollTop only ever increases.
    view.scrollToPos(300);
    view.scrollToPos(600);
    expect(view.pinned()).toBe("false");
    view.unmount();
  });

  it("unpins on an upward scroll and re-pins at the bottom", () => {
    const view = setup({ track: true });
    view.scrollToPos(900); // establish baseline near bottom
    expect(view.pinned()).toBe("false");

    view.scrollToPos(400); // user scrolls up
    expect(view.pinned()).toBe("true");

    view.scrollToPos(900); // user returns to the bottom
    expect(view.pinned()).toBe("false");
    view.unmount();
  });

  it("scrollToBottom scrolls to the end and clears the scrolled-up state", () => {
    const view = setup({ track: true });
    view.scrollToPos(900);
    view.scrollToPos(300);
    expect(view.pinned()).toBe("true");

    view.clickJump();
    expect(view.pinned()).toBe("false");
    expect(view.getTop()).toBe(1000);
    view.unmount();
  });

  it("pins instantly (behavior:auto) but honors smooth for the user jump", () => {
    // The auto-pin must be instant so it doesn't trail bursts of new parts;
    // only the user-initiated jump uses the requested smooth behavior.
    const calls: (ScrollBehavior | undefined)[] = [];
    const proto = HTMLDivElement.prototype as unknown as {
      scrollTo?: (opts: ScrollToOptions) => void;
    };
    const original = proto.scrollTo;
    proto.scrollTo = function scrollTo(opts: ScrollToOptions) {
      calls.push(opts?.behavior);
    };
    try {
      const view = setup({ autoPin: true, behavior: "smooth" });
      // The mount pin fired with behavior:"auto", never smooth.
      expect(calls).toContain("auto");
      expect(calls).not.toContain("smooth");

      calls.length = 0;
      view.clickJump();
      expect(calls).toEqual(["smooth"]);
      view.unmount();
    } finally {
      proto.scrollTo = original;
    }
  });
});
