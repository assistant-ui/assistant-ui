// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createThreadViewportAutoScroll } from "./thread-viewport-auto-scroll";
import type { ThreadViewportAutoScrollOptions } from "./thread-viewport-auto-scroll";

const options = (): ThreadViewportAutoScrollOptions => ({
  autoScroll: true,
  scrollToBottomOnInitialize: true,
  scrollToBottomOnRunStart: true,
  scrollToBottomOnThreadSwitch: true,
});

const geometry = (scrollHeight = 500, clientHeight = 500) => {
  const element = document.createElement("div");
  let top = 0;
  let height = scrollHeight;
  Object.defineProperties(element, {
    scrollTop: {
      get: () => top,
      set: (value: number) => {
        top = value;
      },
      configurable: true,
    },
    scrollHeight: { get: () => height, configurable: true },
    clientHeight: { get: () => clientHeight, configurable: true },
  });
  const scrollTo = vi.fn(({ top: target }: ScrollToOptions) => {
    top = Math.max(0, Math.min(target ?? 0, height - clientHeight));
    element.dispatchEvent(new Event("scroll"));
  });
  Object.defineProperty(element, "scrollTo", { value: scrollTo });
  return {
    element,
    scrollTo,
    setTop: (value: number) => {
      top = value;
      element.dispatchEvent(new Event("scroll"));
    },
    grow: (value: number) => {
      height = value;
    },
  };
};

let observers: TestResizeObserver[];
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;

class TestResizeObserver {
  private readonly callback: ResizeObserverCallback;
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const flushFrames = () => {
  const scheduled = [...frames.values()];
  frames.clear();
  for (const callback of scheduled) callback(0);
};

beforeEach(() => {
  observers = [];
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  vi.stubGlobal("MutationObserver", undefined);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => vi.unstubAllGlobals());

describe("createThreadViewportAutoScroll", () => {
  it("follows the first content resize after attaching over overflowing history", () => {
    const view = geometry(500, 100);
    const onAtBottomChange = vi.fn();
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange,
    });
    controller.attach(view.element);
    expect(controller.isAtBottom).toBe(true);
    expect(onAtBottomChange).not.toHaveBeenCalled();

    observers[0]!.trigger();
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    expect(view.element.scrollTop).toBe(400);
    controller.dispose();
  });

  it("follows an inset reported before attachment", () => {
    const view = geometry(500, 100);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.setContentInset(50);
    controller.attach(view.element);
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    expect(view.element.scrollTop).toBe(400);
    controller.dispose();
  });

  it("follows content growth while pinned and unpins on user scroll up", () => {
    const view = geometry();
    const onAtBottomChange = vi.fn();
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange,
    });
    controller.attach(view.element);
    view.grow(1000);
    observers[0]!.trigger();
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: "instant",
    });
    expect(controller.isAtBottom).toBe(true);

    view.setTop(100);
    expect(controller.isAtBottom).toBe(false);
    expect(onAtBottomChange).toHaveBeenCalledExactlyOnceWith(false);
    view.scrollTo.mockClear();
    view.grow(1500);
    observers[0]!.trigger();
    expect(view.scrollTo).not.toHaveBeenCalled();

    view.setTop(1000);
    expect(controller.isAtBottom).toBe(true);
    expect(onAtBottomChange).toHaveBeenLastCalledWith(true);
    controller.dispose();
  });

  it("restarts element bookkeeping and initialization on each attachment", () => {
    const first = geometry();
    const second = geometry();
    const onAtBottomChange = vi.fn();
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange,
    });
    controller.setHasMessages(true);
    const detach = controller.attach(first.element);
    flushFrames();
    first.grow(1000);
    observers[0]!.trigger();
    first.setTop(100);
    expect(controller.isAtBottom).toBe(false);
    detach();

    const detachNext = controller.attach(second.element);
    expect(controller.isAtBottom).toBe(true);
    detach();
    expect(frames.size).toBe(1);
    flushFrames();
    expect(second.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    expect(onAtBottomChange.mock.calls.map(([value]) => value)).toEqual([
      false,
      true,
    ]);
    detachNext();
  });

  it("cancels scheduled intent on pointerdown", () => {
    const view = geometry();
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), autoScroll: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.runStarted();
    expect(frames.size).toBe(1);
    view.element.dispatchEvent(new Event("pointerdown"));
    expect(frames.size).toBe(0);
    view.grow(1000);
    observers[0]!.trigger();
    flushFrames();
    expect(view.scrollTo).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("cancels a queued bottom scroll when the user scrolls up", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.runStarted();
    expect(frames.size).toBe(1);

    view.setTop(200);
    expect(controller.isAtBottom).toBe(false);
    flushFrames();
    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(controller.isAtBottom).toBe(false);
    controller.dispose();
  });

  it("follows inset growth and leaves scroll position alone on shrink", () => {
    const view = geometry(600, 100);
    view.setTop(500);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.setContentInset(30);
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 600,
      behavior: "instant",
    });
    view.scrollTo.mockClear();
    controller.setContentInset(10);
    expect(view.scrollTo).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("reads the initialize, run start, and thread switch gates live", () => {
    const view = geometry();
    let current = { ...options(), scrollToBottomOnInitialize: false };
    const controller = createThreadViewportAutoScroll({
      getOptions: () => current,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.setHasMessages(true);
    expect(frames.size).toBe(0);
    current = { ...current, scrollToBottomOnInitialize: true };
    controller.setHasMessages(true);
    flushFrames();
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    view.scrollTo.mockClear();
    controller.setHasMessages(true);
    expect(frames.size).toBe(0);
    controller.setHasMessages(false);
    view.element.dispatchEvent(new Event("pointerdown"));
    controller.setHasMessages(true);
    expect(frames.size).toBe(1);
    flushFrames();

    current = { ...current, scrollToBottomOnRunStart: false };
    controller.runStarted();
    expect(frames.size).toBe(0);
    current = { ...current, scrollToBottomOnRunStart: true };
    controller.runStarted();
    flushFrames();
    expect(view.scrollTo).toHaveBeenLastCalledWith({
      top: 500,
      behavior: "auto",
    });

    current = { ...current, scrollToBottomOnThreadSwitch: false };
    controller.threadSwitched();
    expect(frames.size).toBe(0);
    current = { ...current, scrollToBottomOnThreadSwitch: true };
    controller.threadSwitched();
    flushFrames();
    expect(view.scrollTo).toHaveBeenLastCalledWith({
      top: 500,
      behavior: "instant",
    });
    controller.scrollToBottom();
    expect(view.scrollTo).toHaveBeenLastCalledWith({
      top: 500,
      behavior: "auto",
    });
    controller.dispose();
  });

  it("detaches listeners and observer, and cancels a pending frame", () => {
    const view = geometry(1000, 500);
    const onAtBottomChange = vi.fn();
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange,
    });
    const removeListener = vi.spyOn(view.element, "removeEventListener");
    const detach = controller.attach(view.element);
    onAtBottomChange.mockClear();
    controller.runStarted();
    detach();
    expect(observers[0]!.disconnect).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function),
    );
    expect(frames.size).toBe(0);
    view.setTop(200);
    observers[0]!.trigger();
    expect(onAtBottomChange).not.toHaveBeenCalled();
    expect(view.scrollTo).not.toHaveBeenCalled();
    controller.dispose();
  });
});
