// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isUserScrollUp,
  isViewportAtBottom,
  observeContentResize,
  viewportOverflows,
} from "./viewport-scroll";

describe("viewport scroll metrics", () => {
  it("computes bottom pinning from viewport metrics", () => {
    expect(
      isViewportAtBottom({
        scrollTop: 900,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      isViewportAtBottom({
        scrollTop: 899,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      isViewportAtBottom({
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(false);
    expect(
      isViewportAtBottom({ scrollTop: 0, scrollHeight: 80, clientHeight: 100 }),
    ).toBe(true);

    expect(
      viewportOverflows({
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      viewportOverflows({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 }),
    ).toBe(false);
  });

  it("accounts for a bottom content inset when requested", () => {
    const metrics = {
      scrollTop: 350,
      scrollHeight: 500,
      clientHeight: 100,
    };

    expect(isViewportAtBottom(metrics)).toBe(false);
    expect(isViewportAtBottom(metrics, 50)).toBe(true);
    expect(viewportOverflows(metrics, 450)).toBe(false);
  });

  it("distinguishes user scroll-up from content-driven shifts", () => {
    expect(
      isUserScrollUp(
        { scrollTop: 500, scrollHeight: 1000 },
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(true);
    expect(
      isUserScrollUp(
        { scrollTop: 500, scrollHeight: 900 },
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(false);
    expect(
      isUserScrollUp(
        { scrollTop: 400, scrollHeight: 1000 },
        { scrollTop: 500, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(false);
  });
});

describe("observeContentResize", () => {
  const observers = new Set<TestResizeObserver>();

  class TestResizeObserver {
    readonly targets = new Set<Element>();
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      observers.add(this);
    }

    observe(target: Element) {
      this.targets.add(target);
    }

    unobserve(target: Element) {
      this.targets.delete(target);
    }

    disconnect() {
      this.targets.clear();
      observers.delete(this);
    }

    resize(target: Element) {
      if (!this.targets.has(target)) return;
      this.callback([], this as unknown as ResizeObserver);
    }
  }

  const resize = (target: Element) => {
    for (const observer of observers) observer.resize(target);
  };

  const flushMutations = () => new Promise((resolve) => setTimeout(resolve));

  const mountViewport = (childCount: number) => {
    const viewport = document.createElement("div");
    for (let index = 0; index < childCount; index++) {
      viewport.append(document.createElement("div"));
    }
    document.body.append(viewport);
    return viewport;
  };

  afterEach(() => {
    observers.clear();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("reports a child that grows without a DOM mutation", () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const viewport = mountViewport(2);
    const callback = vi.fn();
    const dispose = observeContentResize(viewport, callback);

    resize(viewport.children[1]!);
    expect(callback).toHaveBeenCalledTimes(1);

    dispose();
    resize(viewport.children[1]!);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("follows children added and removed after it starts observing", async () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const viewport = mountViewport(1);
    const callback = vi.fn();
    const dispose = observeContentResize(viewport, callback);

    const added = document.createElement("div");
    viewport.append(added);
    await flushMutations();
    callback.mockClear();

    resize(added);
    expect(callback).toHaveBeenCalledTimes(1);

    added.remove();
    await flushMutations();
    callback.mockClear();

    resize(added);
    expect(callback).not.toHaveBeenCalled();

    dispose();
  });

  it("follows an added child created in another document's realm", async () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const frameDocument = iframe.contentDocument!;
    const viewport = frameDocument.createElement("div");
    frameDocument.body.append(viewport);
    const callback = vi.fn();
    const dispose = observeContentResize(viewport, callback);

    const added = frameDocument.createElement("div");
    expect(added).not.toBeInstanceOf(Element);
    viewport.append(added);
    await flushMutations();
    callback.mockClear();

    resize(added);
    expect(callback).toHaveBeenCalledTimes(1);

    dispose();
  });
});
