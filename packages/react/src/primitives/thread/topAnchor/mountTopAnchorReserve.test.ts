// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mountTopAnchorReserve,
  type TopAnchorStore,
} from "./mountTopAnchorReserve";

class ResizeObserverMock {
  static callbacks: (() => void)[] = [];
  constructor(callback: () => void) {
    ResizeObserverMock.callbacks.push(callback);
  }
  observe = vi.fn();
  disconnect = vi.fn();
}

class MutationObserverMock {
  static callbacks: ((records: MutationRecord[]) => void)[] = [];
  constructor(callback: (records: MutationRecord[]) => void) {
    MutationObserverMock.callbacks.push(callback);
  }
  observe = vi.fn();
  disconnect = vi.fn();
}

const defineReadonlyNumber = (
  element: HTMLElement,
  key: "clientHeight" | "scrollHeight" | "offsetHeight" | "offsetTop",
  value: number,
) => {
  Object.defineProperty(element, key, { configurable: true, value });
};

const makeStore = (state: ReturnType<TopAnchorStore["getState"]>) => {
  const listeners = new Set<() => void>();

  return {
    store: {
      getState: () => state,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } satisfies TopAnchorStore,
    setState: (nextState: ReturnType<TopAnchorStore["getState"]>) => {
      state = nextState;
      for (const listener of listeners) listener();
    },
  };
};

const numericClamp = { tallerThan: 160, visibleHeight: 96 };
const activeTopAnchorTurn = { anchorId: "user-1", targetId: "assistant-1" };

describe("mountTopAnchorReserve", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ResizeObserverMock.callbacks = [];
    MutationObserverMock.callbacks = [];
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("MutationObserver", MutationObserverMock);
    vi.stubGlobal("CSS", { supports: vi.fn(() => false) });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("adds enough stable reserve after the active assistant turn to make the top anchor reachable", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(target);
    document.body.append(reserveHost);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    viewport.scrollTo = vi.fn();

    const { store } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector(
      "[data-aui-top-anchor-reserve]",
    ) as HTMLElement;

    expect(reserve).not.toBe(null);
    expect(reserve.previousElementSibling).toBe(target);
    expect(reserve.style.height).toBe("60px");
  });

  it("preserves the reserve across a transient between-turns anchor gap", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(target);
    document.body.append(reserveHost);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    const unmount = mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector(
      "[data-aui-top-anchor-reserve]",
    ) as HTMLElement;
    const optimisticUserMessage = document.createElement("div");
    reserveHost.append(optimisticUserMessage);
    const appendSpy = vi.spyOn(reserveHost, "append");

    setState({
      turnAnchor: "top",
      element: { viewport, anchor: null, target: null },
      targetConfig: null,
      topAnchorTurn: activeTopAnchorTurn,
    });
    vi.runOnlyPendingTimers();

    expect(reserve.isConnected).toBe(true);
    expect(reserve.style.height).toBe("60px");
    expect(reserve.previousElementSibling).toBe(optimisticUserMessage);
    expect(appendSpy).toHaveBeenCalledTimes(1);

    setState({
      turnAnchor: "top",
      element: { viewport, anchor: null, target: null },
      targetConfig: null,
      topAnchorTurn: activeTopAnchorTurn,
    });
    vi.runOnlyPendingTimers();

    expect(appendSpy).toHaveBeenCalledTimes(1);

    const nextAnchor = document.createElement("div");
    const nextTarget = document.createElement("div");
    reserveHost.append(nextTarget);
    defineReadonlyNumber(nextAnchor, "offsetTop", 236);
    defineReadonlyNumber(nextAnchor, "offsetHeight", 64);

    setState({
      turnAnchor: "top",
      element: { viewport, anchor: nextAnchor, target: nextTarget },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });
    vi.runOnlyPendingTimers();

    expect(reserve.previousElementSibling).toBe(nextTarget);

    unmount();
    expect(reserve.isConnected).toBe(false);
  });

  it("removes the reserve when the active turn is no longer valid", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(target);
    document.body.append(reserveHost);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector(
      "[data-aui-top-anchor-reserve]",
    ) as HTMLElement;

    setState({
      turnAnchor: "top",
      element: { viewport, anchor: null, target: null },
      targetConfig: null,
      topAnchorTurn: null,
    });
    vi.runOnlyPendingTimers();

    expect(reserve.isConnected).toBe(false);
    expect(reserve.style.height).toBe("0px");
  });

  it("removes the reserve when only the registered anchor unmounts", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(target);
    document.body.append(reserveHost);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector(
      "[data-aui-top-anchor-reserve]",
    ) as HTMLElement;

    setState({
      turnAnchor: "top",
      element: { viewport, anchor: null, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });
    vi.runOnlyPendingTimers();

    expect(reserve.isConnected).toBe(false);
    expect(reserve.style.height).toBe("0px");
  });

  it("removes the reserve when the viewport is unavailable", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(target);
    document.body.append(reserveHost);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector(
      "[data-aui-top-anchor-reserve]",
    ) as HTMLElement;

    setState({
      turnAnchor: "top",
      element: { viewport: null, anchor: null, target: null },
      targetConfig: null,
      topAnchorTurn: null,
    });
    vi.runOnlyPendingTimers();

    expect(reserve.isConnected).toBe(false);
    expect(reserve.style.height).toBe("0px");
  });

  it("removes the reserve when top anchoring is disabled", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(target);
    document.body.append(reserveHost);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector(
      "[data-aui-top-anchor-reserve]",
    ) as HTMLElement;

    setState({
      turnAnchor: "bottom",
      element: { viewport, anchor: null, target: null },
      targetConfig: null,
      topAnchorTurn: null,
    });
    vi.runOnlyPendingTimers();

    expect(reserve.isConnected).toBe(false);
    expect(reserve.style.height).toBe("0px");
  });

  const mountPinnedViewport = () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(target);
    document.body.append(reserveHost);

    let naturalScrollHeight = 560;

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    Object.defineProperty(viewport, "scrollHeight", {
      configurable: true,
      get: () => {
        const reserve = document.querySelector<HTMLElement>(
          "[data-aui-top-anchor-reserve]",
        );
        return (
          naturalScrollHeight + Number.parseFloat(reserve?.style.height || "0")
        );
      },
    });
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    anchor.dataset.messageId = "msg-1";
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    const unmount = mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector<HTMLElement>(
      "[data-aui-top-anchor-reserve]",
    )!;
    Object.defineProperty(reserve, "offsetHeight", {
      configurable: true,
      get: () => Number.parseFloat(reserve.style.height || "0"),
    });
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({
      top: 220,
      behavior: "smooth",
    });

    viewport.scrollTop = 220;
    viewport.dispatchEvent(new Event("scroll"));

    return {
      viewport,
      anchor,
      target,
      store,
      setState,
      unmount,
      notifyLayout: () => ResizeObserverMock.callbacks.at(-1)!(),
      notifyReplacement: () =>
        MutationObserverMock.callbacks.at(-1)!([
          {
            type: "childList",
            addedNodes: { length: 1 },
            removedNodes: { length: 1 },
          } as MutationRecord,
        ]),
      notifyCharacterData: () =>
        MutationObserverMock.callbacks.at(-1)!([
          { type: "characterData" } as MutationRecord,
        ]),
      notifySeparateChildChanges: () =>
        MutationObserverMock.callbacks.at(-1)!([
          {
            type: "childList",
            addedNodes: { length: 1 },
            removedNodes: { length: 0 },
          } as MutationRecord,
          {
            type: "childList",
            addedNodes: { length: 0 },
            removedNodes: { length: 1 },
          } as MutationRecord,
        ]),
      setNaturalScrollHeight: (height: number) => {
        naturalScrollHeight = height;
      },
    };
  };

  it("restores the pre-clamp position when the old offset becomes unreachable", () => {
    const { viewport, setNaturalScrollHeight } = mountPinnedViewport();

    setNaturalScrollHeight(400);
    viewport.scrollTop = 60;
    viewport.dispatchEvent(new Event("scroll"));
    setNaturalScrollHeight(560);
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({
      top: 220,
      behavior: "instant",
    });
  });

  it("does not restore a reachable programmatic upward scroll", () => {
    const { viewport, notifyLayout } = mountPinnedViewport();

    notifyLayout();
    viewport.scrollTop = 100;
    viewport.dispatchEvent(new Event("scroll"));
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("restores a transient replacement clamp after the range has recovered", () => {
    const { viewport, notifyReplacement } = mountPinnedViewport();

    viewport.scrollTop = 60;
    notifyReplacement();
    viewport.dispatchEvent(new Event("scroll"));
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({
      top: 220,
      behavior: "instant",
    });
  });

  it("does not restore an upward scroll beside an ordinary content mutation", () => {
    const { viewport, notifyCharacterData } = mountPinnedViewport();

    viewport.scrollTop = 100;
    notifyCharacterData();
    viewport.dispatchEvent(new Event("scroll"));
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("does not combine separate child mutations into a replacement", () => {
    const { viewport, notifySeparateChildChanges } = mountPinnedViewport();

    viewport.scrollTop = 100;
    notifySeparateChildChanges();
    viewport.dispatchEvent(new Event("scroll"));
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("leaves replacement scrolling to browsers with native scroll anchoring", () => {
    vi.mocked(CSS.supports).mockReturnValue(true);
    const { viewport, notifyReplacement } = mountPinnedViewport();

    viewport.scrollTop = 60;
    notifyReplacement();
    viewport.dispatchEvent(new Event("scroll"));
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("does not restore an out-of-range movement that did not land at the maximum", () => {
    const { viewport, setNaturalScrollHeight, notifyLayout } =
      mountPinnedViewport();

    setNaturalScrollHeight(400);
    viewport.scrollTop = 40;
    viewport.dispatchEvent(new Event("scroll"));
    setNaturalScrollHeight(560);
    notifyLayout();
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("restores at most once per anchor turn", () => {
    const { viewport, setNaturalScrollHeight, notifyLayout } =
      mountPinnedViewport();

    setNaturalScrollHeight(400);
    viewport.scrollTop = 60;
    viewport.dispatchEvent(new Event("scroll"));
    setNaturalScrollHeight(560);
    vi.runOnlyPendingTimers();
    expect(viewport.scrollTo).toHaveBeenCalledTimes(2);

    viewport.scrollTop = 220;
    viewport.dispatchEvent(new Event("scroll"));
    setNaturalScrollHeight(400);
    viewport.scrollTop = 60;
    viewport.dispatchEvent(new Event("scroll"));
    setNaturalScrollHeight(560);
    notifyLayout();
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
  });

  it("drops a pending restore across an anchor-gap thread transition", () => {
    const { viewport, setState, setNaturalScrollHeight } =
      mountPinnedViewport();

    setNaturalScrollHeight(400);
    viewport.scrollTop = 60;
    viewport.dispatchEvent(new Event("scroll"));

    setState({
      turnAnchor: "top",
      element: { viewport, anchor: null, target: null },
      targetConfig: null,
      topAnchorTurn: activeTopAnchorTurn,
    });
    vi.runOnlyPendingTimers();

    const nextAnchor = document.createElement("div");
    const nextTarget = document.createElement("div");
    document.body.append(nextTarget);
    defineReadonlyNumber(nextAnchor, "offsetTop", 480);
    defineReadonlyNumber(nextAnchor, "offsetHeight", 64);
    nextAnchor.dataset.messageId = "msg-2";

    setState({
      turnAnchor: "top",
      element: { viewport, anchor: nextAnchor, target: nextTarget },
      targetConfig: numericClamp,
      topAnchorTurn: { anchorId: "user-2", targetId: "assistant-2" },
    });
    setNaturalScrollHeight(560);
    vi.runOnlyPendingTimers();
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({
      top: 480,
      behavior: "smooth",
    });
  });

  it("does not repeat the smooth top-anchor scroll for the same message", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const target = document.createElement("div");
    document.body.append(target);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    anchor.dataset.messageId = "msg-1";
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);

    setState({
      turnAnchor: "top",
      element: { viewport, anchor, target },
      targetConfig: numericClamp,
      topAnchorTurn: activeTopAnchorTurn,
    });
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });
});
