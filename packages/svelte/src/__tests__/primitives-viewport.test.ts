import { describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import { provideAui } from "../provideAui";
import * as sveltePrimitives from "../index";
import {
  threadScrollToBottom,
  threadViewport,
} from "../primitives/threadViewport";
import Host from "./fixtures/Host.svelte";
import { createEchoRuntime, type AnyClient } from "./clients";

const makeScrollable = (el: HTMLElement) => {
  let scrollTop = 0;
  let scrollHeight = 500;
  const clientHeight = 500;
  Object.defineProperty(el, "scrollTop", {
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
    configurable: true,
  });
  Object.defineProperty(el, "scrollHeight", {
    get: () => scrollHeight,
    configurable: true,
  });
  Object.defineProperty(el, "clientHeight", {
    get: () => clientHeight,
    configurable: true,
  });
  const scrollTo = vi.fn(({ top }: { top: number }) => {
    scrollTop = Math.max(0, Math.min(top, scrollHeight - clientHeight));
    el.dispatchEvent(new Event("scroll"));
  });
  Object.defineProperty(el, "scrollTo", {
    value: scrollTo,
    configurable: true,
  });
  return {
    scrollTo,
    setScrollTop: (value: number) => {
      scrollTop = value;
    },
    grow: (height: number) => {
      scrollHeight = height;
      // A child mutation drives the MutationObserver's content-resize path
      el.appendChild(document.createElement("span"));
    },
    dispatchScroll: () => el.dispatchEvent(new Event("scroll")),
  };
};

const mountViewport = (
  seed: { id: string; role: "user" | "assistant"; text: string }[] = [],
  options?: Parameters<typeof threadViewport>[0],
) => {
  const echo = createEchoRuntime();
  if (seed.length > 0) echo.setMessages(seed);
  let viewport!: ReturnType<typeof threadViewport>;
  let aui!: AnyClient;
  const app = mount(Host, {
    target: document.createElement("div"),
    props: {
      setup: () => {
        aui = provideAui(
          AuiConfig({ threads: RuntimeAdapter(echo.runtime) }),
        ) as AnyClient;
        viewport = threadViewport(options);
      },
    },
  });
  const el = document.createElement("div");
  const controls = makeScrollable(el);
  const detach = viewport.attach(el);
  return { app, echo, aui, viewport, el, controls, detach };
};

const mountOverflowingViewport = async () => {
  const mounted = mountViewport();
  mounted.controls.grow(1000);
  await vi.waitFor(() => expect(mounted.controls.scrollTo).toHaveBeenCalled());
  return mounted;
};

const makeFooter = (height: () => number, marginTop = 0) => {
  const el = document.createElement("div");
  el.style.marginTop = `${marginTop}px`;
  Object.defineProperty(el, "offsetHeight", { get: height });
  return el;
};

describe("threadViewport", () => {
  it("auto-scrolls on content growth while pinned to the bottom", async () => {
    const { app, controls } = mountViewport();

    controls.grow(1000);
    await vi.waitFor(() => expect(controls.scrollTo).toHaveBeenCalled());
    expect(controls.scrollTo).toHaveBeenLastCalledWith({
      top: 1000,
      behavior: "instant",
    });

    flushSync(() => void unmount(app));
  });

  it("a user scroll up unpins and growth stops following", async () => {
    const { app, viewport, controls } = mountViewport();

    controls.grow(1000);
    await vi.waitFor(() => expect(controls.scrollTo).toHaveBeenCalled());
    expect(viewport.isAtBottom).toBe(true);

    controls.setScrollTop(100);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(false);

    const calls = controls.scrollTo.mock.calls.length;
    controls.grow(1500);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(controls.scrollTo.mock.calls.length).toBe(calls);

    flushSync(() => void unmount(app));
  });

  it("returning to the bottom repins", async () => {
    const { app, viewport, controls } = mountViewport();

    controls.grow(1000);
    await vi.waitFor(() => expect(controls.scrollTo).toHaveBeenCalled());
    controls.setScrollTop(100);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(false);

    controls.setScrollTop(500);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(true);

    const calls = controls.scrollTo.mock.calls.length;
    controls.grow(1500);
    await vi.waitFor(() =>
      expect(controls.scrollTo.mock.calls.length).toBeGreaterThan(calls),
    );

    flushSync(() => void unmount(app));
  });

  it("scrolls on run start and honors the option gate", async () => {
    const { app, echo, controls } = mountViewport();

    flushTapSync(() => echo.setRunning(true));
    await vi.waitFor(() =>
      expect(controls.scrollTo).toHaveBeenCalledWith({
        top: 500,
        behavior: "auto",
      }),
    );

    flushSync(() => void unmount(app));

    const gated = mountViewport([], {
      scrollToBottomOnRunStart: false,
      scrollToBottomOnInitialize: false,
    });
    flushTapSync(() => gated.echo.setRunning(true));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(gated.controls.scrollTo).not.toHaveBeenCalled();
    flushSync(() => void unmount(gated.app));
  });

  it("scrolls instantly on a thread switch via selectionChanged", async () => {
    const { app, aui, controls } = mountViewport([
      { id: "u0", role: "user", text: "hi" },
    ]);
    await vi.waitFor(() => expect(controls.scrollTo).toHaveBeenCalled());
    const calls = controls.scrollTo.mock.calls.length;

    flushTapSync(() => aui.threads.switchToNewThread());
    await vi.waitFor(() =>
      expect(controls.scrollTo.mock.calls.length).toBeGreaterThan(calls),
    );
    expect(controls.scrollTo).toHaveBeenLastCalledWith({
      top: 500,
      behavior: "instant",
    });

    flushSync(() => void unmount(app));
  });

  it("a pointer gesture cancels a scheduled scroll", async () => {
    const { app, echo, el, controls } = mountViewport([], {
      scrollToBottomOnInitialize: false,
    });

    flushTapSync(() => echo.setRunning(true));
    // The run-start event delivers on a microtask; the gesture lands after it
    await Promise.resolve();
    el.dispatchEvent(new Event("pointerdown"));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(controls.scrollTo).not.toHaveBeenCalled();

    flushSync(() => void unmount(app));
  });

  it("re-attaching to a fresh element restarts the per-element state", async () => {
    const { app, viewport, controls, detach } = mountViewport([
      { id: "u0", role: "user", text: "hi" },
    ]);
    await vi.waitFor(() => expect(controls.scrollTo).toHaveBeenCalled());

    controls.grow(1000);
    await vi.waitFor(() => expect(viewport.isAtBottom).toBe(true));
    controls.setScrollTop(100);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(false);
    detach();

    const next = document.createElement("div");
    const nextControls = makeScrollable(next);
    const detachNext = viewport.attach(next);
    expect(viewport.isAtBottom).toBe(true);
    await vi.waitFor(() =>
      expect(nextControls.scrollTo).toHaveBeenCalledWith({
        top: 500,
        behavior: "instant",
      }),
    );

    detachNext();
    flushSync(() => void unmount(app));
  });

  it("seeds an initial scroll once messages exist", async () => {
    const { app, controls } = mountViewport([
      { id: "u0", role: "user", text: "hi" },
    ]);

    await vi.waitFor(() =>
      expect(controls.scrollTo).toHaveBeenCalledWith({
        top: 500,
        behavior: "instant",
      }),
    );

    flushSync(() => void unmount(app));
  });
});

describe("threadScrollToBottom", () => {
  it("is disabled at the bottom, scrolls when unpinned, and honors vetoes", async () => {
    const { app, viewport, controls } = mountViewport();
    const button = threadScrollToBottom({ viewport });

    controls.grow(1000);
    await vi.waitFor(() => expect(controls.scrollTo).toHaveBeenCalled());
    expect(button.props.disabled).toBe(true);

    controls.setScrollTop(100);
    controls.dispatchScroll();
    expect(button.props.disabled).toBe(false);

    const vetoed = new MouseEvent("click", { cancelable: true });
    vetoed.preventDefault();
    const calls = controls.scrollTo.mock.calls.length;
    button.props.onclick(vetoed);
    expect(controls.scrollTo.mock.calls.length).toBe(calls);

    button.props.onclick();
    expect(controls.scrollTo).toHaveBeenLastCalledWith({
      top: 1000,
      behavior: "auto",
    });

    flushSync(() => void unmount(app));
  });
});

describe("threadViewportFooter", () => {
  it("registers its height with the viewport", async () => {
    const { app, viewport, controls } = await mountOverflowingViewport();
    const footer = sveltePrimitives.threadViewportFooter({ viewport });
    const detachFooter = footer.attach(makeFooter(() => 45, 5));

    controls.setScrollTop(455);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(true);

    detachFooter();
    flushSync(() => void unmount(app));
  });

  it("sums the heights of multiple footers", async () => {
    const { app, viewport, controls } = await mountOverflowingViewport();
    const first = sveltePrimitives.threadViewportFooter({ viewport });
    const second = sveltePrimitives.threadViewportFooter({ viewport });
    const detachFirst = first.attach(makeFooter(() => 20));
    const detachSecond = second.attach(makeFooter(() => 30));

    controls.setScrollTop(455);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(true);

    detachSecond();
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(false);

    controls.setScrollTop(485);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(true);

    detachFirst();
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(false);
    flushSync(() => void unmount(app));
  });

  it("removes a footer's inset when its attachment is destroyed", async () => {
    const { app, viewport, controls } = await mountOverflowingViewport();
    const footer = sveltePrimitives.threadViewportFooter({ viewport });
    const detachFooter = footer.attach(makeFooter(() => 50));

    controls.setScrollTop(455);
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(true);

    detachFooter();
    controls.dispatchScroll();
    expect(viewport.isAtBottom).toBe(false);

    flushSync(() => void unmount(app));
  });

  it("follows a footer's growth while pinned", async () => {
    let triggerResize: ((target: Element) => void) | undefined;
    class FooterResizeObserver {
      private readonly observedTargets = new Set<Element>();

      constructor(callback: ResizeObserverCallback) {
        triggerResize = (target) => {
          if (this.observedTargets.has(target)) {
            callback([], this as unknown as ResizeObserver);
          }
        };
      }
      observe(target: Element) {
        this.observedTargets.add(target);
      }
      disconnect() {
        this.observedTargets.clear();
      }
    }
    vi.stubGlobal("ResizeObserver", FooterResizeObserver);
    try {
      const { app, viewport, controls } = await mountOverflowingViewport();
      let height = 50;
      const footer = sveltePrimitives.threadViewportFooter({ viewport });
      const footerElement = makeFooter(() => height);
      const detachFooter = footer.attach(footerElement);

      controls.scrollTo.mockClear();
      height = 80;
      triggerResize?.(footerElement);
      expect(controls.scrollTo).toHaveBeenCalledWith({
        top: 1000,
        behavior: "instant",
      });

      detachFooter();
      flushSync(() => void unmount(app));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
