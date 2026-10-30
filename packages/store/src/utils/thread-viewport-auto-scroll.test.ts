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
  let viewportHeight = clientHeight;
  Object.defineProperties(element, {
    scrollTop: {
      get: () => top,
      set: (value: number) => {
        top = value;
      },
      configurable: true,
    },
    scrollHeight: { get: () => height, configurable: true },
    clientHeight: { get: () => viewportHeight, configurable: true },
  });
  const scrollTo = vi.fn(({ top: target }: ScrollToOptions) => {
    top = Math.max(0, Math.min(target ?? 0, height - viewportHeight));
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
    resize: (value: number) => {
      viewportHeight = value;
      top = Math.max(0, Math.min(top, height - viewportHeight));
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

  it("keeps the reader in place when autoScroll is enabled after unfollowed growth", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    let autoScroll = false;
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({
        ...options(),
        autoScroll,
        scrollToBottomOnInitialize: false,
      }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.grow(1500);
    observers[0]!.trigger();
    expect(controller.isAtBottom).toBe(false);

    autoScroll = true;
    view.grow(1600);
    observers[0]!.trigger();
    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(view.element.scrollTop).toBe(400);

    view.setTop(1500);
    view.grow(1700);
    observers[0]!.trigger();
    expect(view.element.scrollTop).toBe(1600);
    controller.dispose();
  });

  it("stays unpinned when the reader scrolls upward during content growth", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    view.grow(600);
    view.setTop(300);
    expect(controller.isAtBottom).toBe(false);
    observers[0]!.trigger();
    view.grow(700);
    observers[0]!.trigger();

    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(view.element.scrollTop).toBe(300);
    controller.dispose();
  });

  it("keeps following after a content-growth burst undershoots the bottom", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    view.grow(664);
    view.setTop(506);
    view.element.dispatchEvent(new Event("scroll"));
    expect(view.element.scrollTop).toBeLessThan(564);

    view.grow(864);
    observers[0]!.trigger();

    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 864,
      behavior: "instant",
    });
    expect(view.element.scrollTop).toBe(764);
    expect(controller.isAtBottom).toBe(true);
    controller.dispose();
  });

  it.each([undefined, "false"])(
    "pauses bottom follow after opening a collapsed disclosure with aria-haspopup=%s",
    (popup) => {
      const view = geometry(500, 100);
      view.setTop(400);
      const message = document.createElement("div");
      message.setAttribute("data-message-id", "m1");
      const disclosure = document.createElement("button");
      disclosure.setAttribute("aria-expanded", "false");
      if (popup !== undefined) disclosure.setAttribute("aria-haspopup", popup);
      message.append(disclosure);
      view.element.append(message);

      const controller = createThreadViewportAutoScroll({
        getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
        onAtBottomChange: vi.fn(),
      });
      controller.attach(view.element);
      observers[0]!.trigger();
      view.scrollTo.mockClear();

      disclosure.click();
      view.grow(600);
      observers[0]!.trigger();

      expect(view.scrollTo).not.toHaveBeenCalled();
      expect(view.element.scrollTop).toBe(400);
      expect(controller.isAtBottom).toBe(false);
      controller.dispose();
    },
  );

  it("pauses when opening a closed details summary", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const message = document.createElement("div");
    message.setAttribute("data-message-id", "m1");
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    details.append(summary);
    message.append(details);
    view.element.append(message);

    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    summary.click();
    view.grow(600);
    observers[0]!.trigger();

    expect(view.scrollTo).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("keeps following when closing an open details summary", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const message = document.createElement("div");
    message.setAttribute("data-message-id", "m1");
    const details = document.createElement("details");
    details.setAttribute("open", "");
    const summary = document.createElement("summary");
    details.append(summary);
    message.append(details);
    view.element.append(message);

    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    summary.click();
    view.grow(600);
    observers[0]!.trigger();

    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 600,
      behavior: "instant",
    });
    controller.dispose();
  });

  it.each([
    { label: "an expanded control", attrs: { "aria-expanded": "true" } },
    {
      label: "a dialog trigger",
      attrs: { "aria-expanded": "false", "aria-haspopup": "dialog" },
    },
    {
      label: "a menu trigger",
      attrs: { "aria-expanded": "false", "aria-haspopup": "menu" },
    },
    {
      label: "a combobox",
      attrs: { "aria-expanded": "false", role: "combobox" },
    },
    { label: "a plain control", attrs: {} },
  ])("keeps following after clicking $label", ({ attrs }) => {
    const view = geometry(500, 100);
    view.setTop(400);
    const message = document.createElement("div");
    message.setAttribute("data-message-id", "m1");
    const control = document.createElement("button");
    for (const [name, value] of Object.entries(attrs))
      control.setAttribute(name, value);
    message.append(control);
    view.element.append(message);

    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    control.click();
    view.grow(600);
    observers[0]!.trigger();

    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 600,
      behavior: "instant",
    });
    controller.dispose();
  });

  it("keeps following after clicking a collapsed disclosure outside a message", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const disclosure = document.createElement("button");
    disclosure.setAttribute("aria-expanded", "false");
    view.element.append(disclosure);

    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    disclosure.click();
    view.grow(600);
    observers[0]!.trigger();

    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 600,
      behavior: "instant",
    });
    controller.dispose();
  });

  it("keeps a disclosure pause through a fitting resize and later growth", () => {
    const view = geometry(100, 100);
    const message = document.createElement("div");
    message.setAttribute("data-message-id", "m1");
    const disclosure = document.createElement("button");
    disclosure.setAttribute("aria-expanded", "false");
    message.append(disclosure);
    view.element.append(message);

    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    disclosure.click();
    view.resize(110);
    observers[0]!.trigger();
    view.grow(200);
    observers[0]!.trigger();

    expect(view.scrollTo).not.toHaveBeenCalled();
    controller.dispose();
  });

  it.each(["wheel", " ", "End"])(
    "resumes after %s reaches the overflowing bottom",
    (gesture) => {
      const view = geometry(500, 100);
      view.setTop(400);
      const message = document.createElement("div");
      message.setAttribute("data-message-id", "m1");
      const disclosure = document.createElement("button");
      disclosure.setAttribute("aria-expanded", "false");
      message.append(disclosure);
      view.element.append(message);

      const controller = createThreadViewportAutoScroll({
        getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
        onAtBottomChange: vi.fn(),
      });
      controller.attach(view.element);
      observers[0]!.trigger();
      view.scrollTo.mockClear();

      disclosure.click();
      view.grow(600);
      observers[0]!.trigger();
      expect(view.scrollTo).not.toHaveBeenCalled();

      view.element.dispatchEvent(
        gesture === "wheel"
          ? new WheelEvent("wheel")
          : new KeyboardEvent("keydown", { key: gesture }),
      );
      view.setTop(500);
      view.grow(700);
      observers[0]!.trigger();

      expect(view.scrollTo).toHaveBeenCalledWith({
        top: 700,
        behavior: "instant",
      });
      controller.dispose();
    },
  );

  it("resumes when the reader explicitly scrolls to the bottom", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const message = document.createElement("div");
    message.setAttribute("data-message-id", "m1");
    const disclosure = document.createElement("button");
    disclosure.setAttribute("aria-expanded", "false");
    message.append(disclosure);
    view.element.append(message);

    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    disclosure.click();
    view.grow(600);
    observers[0]!.trigger();
    expect(view.scrollTo).not.toHaveBeenCalled();

    controller.scrollToBottom("instant");
    view.scrollTo.mockClear();
    view.grow(700);
    observers[0]!.trigger();

    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 700,
      behavior: "instant",
    });
    controller.dispose();
  });

  it.each([
    ["a run start", "runStarted"],
    ["a thread switch", "threadSwitched"],
  ] as const)(
    "clears the pause on %s when its scroll is disabled",
    (_, reset) => {
      const view = geometry(500, 100);
      view.setTop(400);
      const message = document.createElement("div");
      message.setAttribute("data-message-id", "m1");
      const disclosure = document.createElement("button");
      disclosure.setAttribute("aria-expanded", "false");
      message.append(disclosure);
      view.element.append(message);

      const controller = createThreadViewportAutoScroll({
        getOptions: () => ({
          ...options(),
          scrollToBottomOnInitialize: false,
          scrollToBottomOnRunStart: false,
          scrollToBottomOnThreadSwitch: false,
        }),
        onAtBottomChange: vi.fn(),
      });
      controller.attach(view.element);
      observers[0]!.trigger();
      view.scrollTo.mockClear();

      disclosure.click();
      view.grow(600);
      observers[0]!.trigger();
      expect(view.scrollTo).not.toHaveBeenCalled();

      controller[reset]();
      view.grow(700);
      observers[0]!.trigger();

      expect(view.scrollTo).toHaveBeenCalledWith({
        top: 700,
        behavior: "instant",
      });
      controller.dispose();
    },
  );

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

  it.each(["pointerdown", "wheel", "touchstart"])(
    "cancels scheduled intent on %s",
    (gesture) => {
      const view = geometry();
      const controller = createThreadViewportAutoScroll({
        getOptions: () => ({ ...options(), autoScroll: false }),
        onAtBottomChange: vi.fn(),
      });
      controller.attach(view.element);
      controller.runStarted();
      expect(frames.size).toBe(1);
      view.element.dispatchEvent(new Event(gesture));
      expect(frames.size).toBe(0);
      view.grow(1000);
      observers[0]!.trigger();
      flushFrames();
      expect(view.scrollTo).not.toHaveBeenCalled();
      controller.dispose();
    },
  );

  it.each(["wheel", "touchstart"])(
    "cancels retained intent on %s",
    (gesture) => {
      const view = geometry(100, 100);
      const controller = createThreadViewportAutoScroll({
        getOptions: () => ({
          ...options(),
          autoScroll: false,
          scrollToBottomOnInitialize: false,
        }),
        onAtBottomChange: vi.fn(),
      });
      controller.attach(view.element);
      controller.runStarted();
      flushFrames();
      view.scrollTo.mockClear();

      view.element.dispatchEvent(new Event(gesture));
      view.grow(200);
      observers[0]!.trigger();

      expect(view.scrollTo).not.toHaveBeenCalled();
      controller.dispose();
    },
  );

  it("keeps following after cancelling intent during a stationary undershoot gesture", () => {
    const view = geometry(500, 100);
    view.setTop(300);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.runStarted();

    view.element.dispatchEvent(new Event("pointerdown"));
    view.grow(600);
    observers[0]!.trigger();

    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 600,
      behavior: "instant",
    });
    controller.dispose();
  });

  it("does not read viewport geometry on a wheel without pending intent", () => {
    const view = geometry();
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({
        ...options(),
        scrollToBottomOnInitialize: false,
      }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    const scrollTop = vi.spyOn(view.element, "scrollTop", "get");
    const scrollHeight = vi.spyOn(view.element, "scrollHeight", "get");
    const clientHeight = vi.spyOn(view.element, "clientHeight", "get");

    view.element.dispatchEvent(new WheelEvent("wheel"));

    expect(scrollTop).not.toHaveBeenCalled();
    expect(scrollHeight).not.toHaveBeenCalled();
    expect(clientHeight).not.toHaveBeenCalled();
    controller.dispose();
  });

  it.each([
    "Enter",
    " ",
    "ArrowUp",
    "ArrowDown",
    "PageUp",
    "PageDown",
    "Home",
    "End",
  ])("cancels a queued bottom scroll on %s outside text entry", (key) => {
    const view = geometry();
    const button = document.createElement("button");
    view.element.append(button);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), autoScroll: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.runStarted();
    expect(frames.size).toBe(1);

    button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    expect(frames.size).toBe(0);
    view.grow(1000);
    observers[0]!.trigger();
    flushFrames();
    expect(view.scrollTo).not.toHaveBeenCalled();
    controller.dispose();
  });

  it.each([
    ["input", "Enter"],
    ["contenteditable", "Enter"],
    ["input", " "],
    ["contenteditable", "ArrowDown"],
  ] as const)("keeps a queued bottom scroll inside %s on %s", (entry, key) => {
    const view = geometry();
    const editable = document.createElement(
      entry === "input" ? "input" : "div",
    );
    if (entry === "contenteditable")
      editable.setAttribute("contenteditable", "true");
    const target =
      entry === "input"
        ? editable
        : editable.appendChild(document.createElement("span"));
    view.element.append(editable);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), autoScroll: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.runStarted();
    expect(frames.size).toBe(1);

    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    expect(frames.size).toBe(1);
    view.grow(1000);
    observers[0]!.trigger();
    flushFrames();
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: "auto",
    });
    controller.dispose();
  });

  it("keeps a scheduled run-start behavior pending through content resize", () => {
    const view = geometry(500, 100);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), autoScroll: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.runStarted();
    view.grow(900);

    observers[0]!.trigger();

    expect(view.scrollTo).not.toHaveBeenCalled();
    flushFrames();
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 900,
      behavior: "auto",
    });
    controller.dispose();
  });

  it("keeps following after a browser-clamped resize during a run", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), scrollToBottomOnInitialize: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.runStarted();

    view.resize(200);
    view.grow(600);
    observers[0]!.trigger();
    view.grow(700);
    observers[0]!.trigger();
    flushFrames();

    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 700,
      behavior: "auto",
    });
    expect(view.element.scrollTop).toBe(500);
    expect(controller.isAtBottom).toBe(true);
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

  it("does not resume following after an inset shrink without message growth", () => {
    const view = geometry(600, 100);
    view.setTop(500);
    const message = document.createElement("div");
    message.dataset["messageId"] = "message-1";
    Object.defineProperty(message, "getBoundingClientRect", {
      value: () => ({ top: 0, bottom: 50, height: 50 }),
    });
    view.element.append(message);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    const inset = controller.registerContentInset();
    inset.setHeight(30);
    view.setTop(470);
    expect(controller.isAtBottom).toBe(true);

    view.scrollTo.mockClear();
    inset.setHeight(10);
    expect(view.scrollTo).not.toHaveBeenCalled();
    observers[0]!.trigger();

    expect(view.element.scrollTop).toBe(470);
    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(controller.isAtBottom).toBe(false);
    controller.dispose();
  });

  it("does not restore following after the reader scrolls up during an inset shrink", () => {
    const view = geometry(600, 100);
    view.setTop(500);
    let messageHeight = 50;
    const message = document.createElement("div");
    message.dataset["messageId"] = "message-1";
    Object.defineProperty(message, "getBoundingClientRect", {
      value: () => ({
        top: 0,
        bottom: messageHeight,
        height: messageHeight,
      }),
    });
    view.element.append(message);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    const inset = controller.registerContentInset();
    inset.setHeight(30);
    view.setTop(470);
    inset.setHeight(10);
    view.setTop(400);

    messageHeight = 60;
    view.scrollTo.mockClear();
    observers[0]!.trigger();

    expect(view.element.scrollTop).toBe(400);
    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(controller.isAtBottom).toBe(false);
    controller.dispose();
  });

  it("sums registered insets and removes them on unregister", () => {
    const view = geometry(600, 100);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    const first = controller.registerContentInset();
    const second = controller.registerContentInset();
    first.setHeight(20);
    second.setHeight(30);

    view.setTop(455);
    expect(controller.isAtBottom).toBe(true);

    second.unregister();
    expect(controller.isAtBottom).toBe(false);
    first.setHeight(45);
    expect(controller.isAtBottom).toBe(true);

    first.unregister();
    expect(controller.isAtBottom).toBe(false);
    second.setHeight(100);
    second.unregister();
    expect(controller.isAtBottom).toBe(false);
    controller.dispose();
  });

  it("re-follows a pinned viewport when a registered inset grows", () => {
    const view = geometry(600, 100);
    view.setTop(500);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    const inset = controller.registerContentInset();
    inset.setHeight(20);
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 600,
      behavior: "instant",
    });

    view.scrollTo.mockClear();
    inset.setHeight(20);
    expect(view.scrollTo).not.toHaveBeenCalled();
    inset.setHeight(40);
    expect(view.scrollTo).toHaveBeenCalledWith({
      top: 600,
      behavior: "instant",
    });

    view.setTop(300);
    view.scrollTo.mockClear();
    inset.setHeight(50);
    expect(view.scrollTo).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("adds registered insets to the direct content inset", () => {
    const view = geometry(600, 100);
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.setContentInset(15);
    const inset = controller.registerContentInset();
    inset.setHeight(20);

    view.setTop(470);
    expect(controller.isAtBottom).toBe(true);
    controller.setContentInset(5);
    expect(controller.isAtBottom).toBe(false);

    view.setTop(480);
    expect(controller.isAtBottom).toBe(true);
    inset.unregister();
    expect(controller.isAtBottom).toBe(false);
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
    expect(removeListener).toHaveBeenCalledWith("wheel", expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function),
    );
    expect(frames.size).toBe(0);
    view.setTop(200);
    observers[0]!.trigger();
    expect(onAtBottomChange).not.toHaveBeenCalled();
    expect(view.scrollTo).not.toHaveBeenCalled();
    const replacement = geometry(1000, 500);
    controller.attach(replacement.element);
    controller.runStarted();
    view.element.dispatchEvent(new Event("wheel"));
    flushFrames();
    expect(replacement.element.scrollTop).toBe(500);
    expect(replacement.scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 1000,
      behavior: "auto",
    });
    controller.dispose();
  });

  it("keeps a coalesced user scroll-up after a programmatic bottom scroll", () => {
    const view = geometry(500, 100);
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), autoScroll: false }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    view.setTop(0);
    view.scrollTo.mockImplementation(({ top }) => {
      view.element.scrollTop = Math.min(top ?? 0, 400);
    });

    controller.scrollToBottom("instant");
    view.setTop(320);
    view.grow(700);
    observers[0]!.trigger();

    expect(view.element.scrollTop).toBe(320);
    expect(view.scrollTo).toHaveBeenCalledOnce();
    expect(controller.isAtBottom).toBe(false);
    controller.dispose();
  });

  it("defers follow while holdFollow is live and resumes after it clears", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    let holdFollow = false;
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), holdFollow }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    observers[0]!.trigger();
    view.scrollTo.mockClear();

    holdFollow = true;
    view.grow(600);
    observers[0]!.trigger();
    controller.setContentInset(20);
    expect(view.element.scrollTop).toBe(400);
    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(controller.isAtBottom).toBe(false);

    holdFollow = false;
    view.grow(700);
    observers[0]!.trigger();
    expect(view.element.scrollTop).toBe(600);
    controller.dispose();
  });

  it("preserves follow while held with autoScroll disabled", () => {
    const view = geometry(500, 100);
    view.setTop(400);
    let current = { ...options(), autoScroll: false, holdFollow: true };
    const controller = createThreadViewportAutoScroll({
      getOptions: () => current,
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    view.grow(600);
    observers[0]!.trigger();
    expect(view.element.scrollTop).toBe(400);

    current = { ...current, autoScroll: true, holdFollow: false };
    view.grow(700);
    observers[0]!.trigger();
    expect(view.element.scrollTop).toBe(600);
    controller.dispose();
  });

  it("drops pending bottom intent on resize while holdFollow is true", () => {
    const view = geometry(100, 100);
    let holdFollow = false;
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), autoScroll: false, holdFollow }),
      onAtBottomChange: vi.fn(),
    });
    controller.attach(view.element);
    controller.scrollToBottom("smooth");
    view.scrollTo.mockClear();

    holdFollow = true;
    view.grow(200);
    observers[0]!.trigger();
    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(controller.isAtBottom).toBe(false);

    holdFollow = false;
    view.grow(300);
    observers[0]!.trigger();
    expect(view.scrollTo).not.toHaveBeenCalled();
    expect(view.element.scrollTop).toBe(0);
    controller.dispose();
  });

  it("reports the summed content inset only when it changes", () => {
    const onContentInsetChange = vi.fn();
    const controller = createThreadViewportAutoScroll({
      getOptions: options,
      onAtBottomChange: vi.fn(),
      onContentInsetChange,
    });
    const first = controller.registerContentInset();
    const second = controller.registerContentInset();
    controller.setContentInset(10);
    first.setHeight(20);
    second.setHeight(30);
    controller.attach(geometry().element);
    second.setHeight(30);
    controller.setContentInset(10);
    controller.setContentInset(5);
    first.unregister();
    first.setHeight(100);
    first.unregister();
    second.unregister();
    controller.setContentInset(0);

    expect(onContentInsetChange.mock.calls).toEqual([
      [10],
      [30],
      [60],
      [55],
      [35],
      [5],
      [0],
    ]);
    controller.dispose();
  });

  it("publishes downward scrolling short of the bottom without pending intent", () => {
    const view = geometry(500, 100);
    const onAtBottomChange = vi.fn();
    const controller = createThreadViewportAutoScroll({
      getOptions: () => ({ ...options(), autoScroll: false }),
      onAtBottomChange,
    });
    controller.attach(view.element);
    expect(controller.isAtBottom).toBe(true);

    view.setTop(100);

    expect(controller.isAtBottom).toBe(false);
    expect(onAtBottomChange).toHaveBeenCalledExactlyOnceWith(false);

    view.setTop(400);
    view.grow(600);
    view.scrollTo.mockImplementation(() => {});
    controller.scrollToBottom("smooth");
    onAtBottomChange.mockClear();
    view.setTop(450);
    expect(controller.isAtBottom).toBe(true);
    expect(onAtBottomChange).not.toHaveBeenCalled();
    view.element.dispatchEvent(new WheelEvent("wheel"));
    expect(controller.isAtBottom).toBe(false);
    expect(onAtBottomChange).toHaveBeenCalledExactlyOnceWith(false);
    controller.dispose();
  });

  describe("earlier messages", () => {
    const pagedViewport = (scrollTop = 0, autoScroll = false) => {
      const view = geometry(320, 100);
      const heights = Array<number>(8).fill(80);
      let growthBelow = 0;
      const messages = heights.map((_, index) => {
        const message = document.createElement("div");
        message.dataset["messageId"] = `message-${index}`;
        message.getBoundingClientRect = () => {
          let top = 40 - view.element.scrollTop;
          for (const sibling of view.element.children) {
            if (sibling === message) break;
            top += heights[messages.indexOf(sibling as HTMLDivElement)]!;
          }
          return new DOMRect(0, top, 100, heights[index]!);
        };
        return message;
      });
      view.element.getBoundingClientRect = () => new DOMRect(0, 40, 100, 100);
      view.element.append(...messages.slice(4));
      const updateHeight = () => {
        view.grow(
          [...view.element.children].reduce(
            (total, message) =>
              total + heights[messages.indexOf(message as HTMLDivElement)]!,
            growthBelow,
          ),
        );
      };
      const controller = createThreadViewportAutoScroll({
        getOptions: () => ({
          ...options(),
          autoScroll,
          scrollToBottomOnInitialize: false,
          scrollToBottomOnRunStart: false,
          scrollToBottomOnThreadSwitch: false,
        }),
        onAtBottomChange: vi.fn(),
      });
      controller.attach(view.element);
      view.setTop(scrollTop);
      const resizeObserver = observers.at(-1)!;
      return {
        ...view,
        controller,
        messages,
        prepend: (extraGrowth = 0) => {
          growthBelow = extraGrowth;
          view.element.prepend(...messages.slice(0, 4));
          updateHeight();
          controller.messagesPrepended("message-4");
          resizeObserver.trigger();
        },
        settle: (index: number) => {
          heights[index] = 120;
          updateHeight();
          resizeObserver.trigger();
        },
      };
    };

    it("keeps the rows a reader scrolled to in place when an earlier page is prepended", () => {
      const view = pagedViewport();
      view.prepend();
      expect(view.element.scrollTop).toBe(320);
      view.controller.dispose();
    });

    it("keeps a reader at the bottom at the bottom with auto-follow off and on", () => {
      for (const autoScroll of [false, true]) {
        const view = pagedViewport(220, autoScroll);
        view.prepend();
        expect(view.element.scrollTop).toBe(540);
        view.controller.dispose();
      }
    });

    it("does not count growth below the reader in the same update as part of the page", () => {
      const view = pagedViewport(100);
      view.prepend(40);
      expect(view.element.scrollTop).toBe(420);
      view.controller.dispose();
    });

    it.each(["pointerdown", "wheel", "touchstart", "keydown"])(
      "holds the rows while the page above settles until the reader's next %s",
      (gesture) => {
        const view = pagedViewport();
        view.prepend();
        expect(view.element.scrollTop).toBe(320);

        view.settle(3);
        expect(view.element.scrollTop).toBe(360);
        view.element.dispatchEvent(
          gesture === "keydown"
            ? new KeyboardEvent("keydown", { key: "ArrowDown" })
            : new Event(gesture),
        );
        view.settle(2);
        expect(view.element.scrollTop).toBe(360);
        view.controller.dispose();
      },
    );

    it("lets go of the held rows when a run starts, so the new turn can take the viewport", () => {
      const view = pagedViewport();
      view.prepend();
      expect(view.element.scrollTop).toBe(320);

      view.controller.runStarted();
      view.settle(3);
      expect(view.element.scrollTop).toBe(320);
      view.controller.dispose();
    });

    it("lets go of the held rows once something else scrolls the viewport", () => {
      const view = pagedViewport();
      view.prepend();
      expect(view.element.scrollTop).toBe(320);

      view.setTop(100);
      view.settle(3);
      expect(view.element.scrollTop).toBe(100);
      view.controller.dispose();
    });

    it("holds the row the reader sees while content between it and the old first message settles", () => {
      const view = pagedViewport(100);
      view.prepend();
      expect(view.element.scrollTop).toBe(420);

      view.settle(4);
      expect(view.element.scrollTop).toBe(460);
      view.controller.dispose();
    });

    it("lets go of held rows on a thread switch even when the new thread repeats the messages", () => {
      const view = pagedViewport();
      view.prepend();
      expect(view.element.scrollTop).toBe(320);

      view.controller.threadSwitched();
      view.settle(3);
      expect(view.element.scrollTop).toBe(320);
      view.controller.dispose();
    });

    it("falls back to total growth when message roots have no IDs", () => {
      const view = pagedViewport(100);
      for (const message of view.messages)
        message.removeAttribute("data-message-id");
      view.setTop(100);

      view.prepend(40);

      expect(view.element.scrollTop).toBe(460);
      view.controller.dispose();
    });
  });
});
