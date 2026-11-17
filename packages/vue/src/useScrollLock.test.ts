import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { useScrollLock } from "./useScrollLock";

const scopes: ReturnType<typeof effectScope>[] = [];

afterEach(() => {
  scopes.forEach((scope) => scope.stop());
  scopes.length = 0;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document.documentElement, "scrollTo");
  Reflect.deleteProperty(document.body, "scrollTo");
  Reflect.deleteProperty(document, "scrollingElement");
  document.documentElement.scrollTop = 0;
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  document.body.replaceChildren();
});

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

function stubScrollTo(element: HTMLElement) {
  const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
    element.scrollTop = top ?? 0;
  });
  Object.defineProperty(element, "scrollTo", {
    configurable: true,
    value: scrollTo,
  });
  return scrollTo;
}

function createLock(animated: HTMLElement) {
  const scope = effectScope();
  scopes.push(scope);
  const target = ref<HTMLElement | null>(animated);
  const lock = scope.run(() => useScrollLock(target, 200))!;
  return { lock, target, scope, dispose: () => scope.stop() };
}

function lockWithin(container: HTMLElement) {
  const animated = document.createElement("div");
  container.appendChild(animated);
  return createLock(animated).lock;
}

function createSharedScroller() {
  const scroller = document.createElement("div");
  scroller.style.overflowY = "auto";
  scroller.style.borderWidth = "0px";
  scroller.style.paddingRight = "4px";
  document.body.appendChild(scroller);
  Object.defineProperty(scroller, "offsetWidth", { value: 306 });
  Object.defineProperty(scroller, "clientWidth", {
    get: () => (scroller.style.scrollbarWidth === "none" ? 306 : 300),
  });
  const first = document.createElement("div");
  const second = document.createElement("div");
  scroller.append(first, second);
  return { scroller, first: createLock(first), second: createLock(second) };
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

  it("compensates when the scroller is the root element", () => {
    const root = document.documentElement;
    root.style.overflowY = "auto";
    stubWidths(root, { offsetWidth: 1599, clientWidth: 1599 });
    vi.stubGlobal("innerWidth", 1605);

    lockWithin(document.body)();

    expect(root.style.scrollbarWidth).toBe("none");
    expect(root.style.paddingRight).toBe("6px");
  });

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
    scroller.style.paddingRight = "4px";
    document.body.appendChild(scroller);
    stubWidths(scroller, { offsetWidth: 306, clientWidth: 300 });

    lockWithin(scroller)();
    expect(scroller.style.paddingRight).toBe("10px");

    vi.advanceTimersByTime(200);

    expect(scroller.style.paddingRight).toBe("4px");
    expect(scroller.style.scrollbarWidth).toBe("");
  });

  it("keeps overlapping animations locked until the last one finishes", () => {
    vi.useFakeTimers();
    const { scroller, first, second } = createSharedScroller();
    stubScrollTo(scroller);
    scroller.scrollTop = 120;

    first.lock();
    vi.advanceTimersByTime(100);
    second.lock();
    expect(scroller.style.paddingRight).toBe("10px");

    vi.advanceTimersByTime(100);
    expect(scroller.style.scrollbarWidth).toBe("none");
    expect(scroller.style.paddingRight).toBe("10px");
    scroller.scrollTop = 90;
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.scrollTop).toBe(120);

    vi.advanceTimersByTime(100);
    expect(scroller.style.scrollbarWidth).toBe("");
    expect(scroller.style.paddingRight).toBe("4px");
    scroller.scrollTop = 90;
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.scrollTop).toBe(90);
  });

  it.each(["first", "second"] as const)(
    "preserves a restarted shared lock when the %s owner is disposed first",
    (disposedFirst) => {
      vi.useFakeTimers();
      const shared = createSharedScroller();
      const { scroller, first, second } = shared;
      first.lock();
      second.lock();
      vi.advanceTimersByTime(100);
      first.lock();

      shared[disposedFirst].dispose();
      expect(scroller.style.scrollbarWidth).toBe("none");
      expect(scroller.style.paddingRight).toBe("10px");

      shared[disposedFirst === "first" ? "second" : "first"].dispose();
      expect(scroller.style.scrollbarWidth).toBe("");
      expect(scroller.style.paddingRight).toBe("4px");
      scroller.style.scrollbarWidth = "thin";
      vi.advanceTimersByTime(200);
      expect(scroller.style.scrollbarWidth).toBe("thin");
    },
  );

  it("leaves the padding alone when no scrollbar takes space", () => {
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    scroller.style.borderWidth = "0px";
    document.body.appendChild(scroller);
    stubWidths(scroller, { offsetWidth: 300, clientWidth: 300 });

    lockWithin(scroller)();

    expect(scroller.style.paddingRight).toBe("");
  });

  it("locks the current scroll container after the element is reparented", () => {
    vi.useFakeTimers();
    const first = document.createElement("div");
    const second = document.createElement("div");
    first.style.overflowY = "auto";
    second.style.overflowY = "auto";
    document.body.append(first, second);

    const animated = document.createElement("div");
    first.appendChild(animated);
    const { lock, scope } = createLock(animated);

    lock();
    expect(first.style.scrollbarWidth).toBe("none");

    second.appendChild(animated);
    lock();

    expect(first.style.scrollbarWidth).toBe("");
    expect(second.style.scrollbarWidth).toBe("none");

    scope.stop();
    expect(second.style.scrollbarWidth).toBe("");
  });

  it("forgets the old cleanup after moving outside a scroll container", () => {
    const scroller = document.createElement("div");
    const plainContainer = document.createElement("div");
    scroller.style.overflowY = "auto";
    document.body.append(scroller, plainContainer);

    const animated = document.createElement("div");
    scroller.appendChild(animated);
    const { lock, scope } = createLock(animated);

    lock();
    plainContainer.appendChild(animated);
    lock();
    scroller.style.scrollbarWidth = "thin";

    scope.stop();

    expect(scroller.style.scrollbarWidth).toBe("thin");
  });

  it("holds scroll position during the animation and releases it afterward", () => {
    vi.useFakeTimers();
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    document.body.appendChild(scroller);
    stubScrollTo(scroller);
    scroller.scrollTop = 120;

    lockWithin(scroller)();
    scroller.scrollTop = 90;
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.scrollTop).toBe(120);

    vi.advanceTimersByTime(200);
    scroller.scrollTop = 90;
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.scrollTop).toBe(90);
  });

  it("compensates the left gutter in RTL", () => {
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    scroller.style.direction = "rtl";
    scroller.style.borderWidth = "0px";
    scroller.style.paddingLeft = "3px";
    document.body.appendChild(scroller);
    stubWidths(scroller, { offsetWidth: 306, clientWidth: 300 });

    lockWithin(scroller)();

    expect(scroller.style.paddingLeft).toBe("9px");
    expect(scroller.style.paddingRight).toBe("");
  });

  it("resets smooth scrolling instantly", () => {
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    scroller.style.scrollBehavior = "smooth";
    document.body.appendChild(scroller);
    const scrollTo = stubScrollTo(scroller);
    scroller.scrollTop = 120;

    lockWithin(scroller)();
    scroller.scrollTop = 90;
    scroller.dispatchEvent(new Event("scroll"));

    expect(scrollTo).toHaveBeenCalledWith({ top: 120, behavior: "instant" });
    expect(scroller.scrollTop).toBe(120);
  });

  it("holds root scroll events from document and releases them afterward", () => {
    vi.useFakeTimers();
    const root = document.documentElement;
    root.style.overflowY = "auto";
    stubScrollTo(root);
    root.scrollTop = 120;

    lockWithin(document.body)();
    root.scrollTop = 90;
    document.dispatchEvent(new Event("scroll"));
    expect(root.scrollTop).toBe(120);

    vi.advanceTimersByTime(200);
    root.scrollTop = 90;
    document.dispatchEvent(new Event("scroll"));
    expect(root.scrollTop).toBe(90);
  });

  it("locks viewport position when body overflow propagates to the root", () => {
    vi.useFakeTimers();
    const root = document.documentElement;
    const body = document.body;
    root.style.overflowY = "visible";
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: root,
    });
    body.style.overflowY = "auto";
    body.scrollTop = 0;
    body.scrollTo = vi.fn();
    const scrollTo = stubScrollTo(root);
    root.scrollTop = 120;

    lockWithin(body)();
    expect(body.style.scrollbarWidth).toBe("none");
    expect(root.style.scrollbarWidth).toBe("");
    root.scrollTop = 90;
    document.dispatchEvent(new Event("scroll"));
    expect(scrollTo).toHaveBeenCalledWith({ top: 120, behavior: "instant" });
    expect(root.scrollTop).toBe(120);

    vi.advanceTimersByTime(200);
    root.scrollTop = 90;
    document.dispatchEvent(new Event("scroll"));
    expect(root.scrollTop).toBe(90);
  });
});
