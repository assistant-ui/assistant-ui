// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR,
  TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR,
} from "../ThreadViewportSlack";
import {
  mountTopAnchorReserve,
  type TopAnchorStore,
} from "./mountTopAnchorReserve";

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

class MutationObserverMock {
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

describe("mountTopAnchorReserve", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("MutationObserver", MutationObserverMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("adds enough stable reserve after the active assistant turn to make the top anchor reachable", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const slack = document.createElement("div");
    const reserveHost = document.createElement("div");
    reserveHost.append(slack);
    document.body.append(reserveHost);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    viewport.scrollTo = vi.fn();
    slack.setAttribute(TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR, "160px");
    slack.setAttribute(TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR, "96px");

    const { store } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, slack },
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    const reserve = reserveHost.querySelector(
      "[data-aui-top-anchor-reserve]",
    ) as HTMLElement;

    expect(reserve).not.toBe(null);
    expect(reserve.previousElementSibling).toBe(slack);
    expect(reserve.style.height).toBe("60px");
  });

  it("does not repeat the smooth top-anchor scroll for the same message", () => {
    const viewport = document.createElement("div");
    const anchor = document.createElement("div");
    const slack = document.createElement("div");
    document.body.append(slack);

    defineReadonlyNumber(viewport, "offsetTop", 0);
    defineReadonlyNumber(viewport, "clientHeight", 400);
    defineReadonlyNumber(viewport, "scrollHeight", 560);
    defineReadonlyNumber(anchor, "offsetTop", 220);
    defineReadonlyNumber(anchor, "offsetHeight", 64);
    anchor.dataset.messageId = "msg-1";
    slack.setAttribute(TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR, "160px");
    slack.setAttribute(TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR, "96px");
    viewport.scrollTo = vi.fn();

    const { store, setState } = makeStore({
      turnAnchor: "top",
      element: { viewport, anchor, slack },
    });

    mountTopAnchorReserve(store);
    vi.runOnlyPendingTimers();

    setState({
      turnAnchor: "top",
      element: { viewport, anchor, slack },
    });
    vi.runOnlyPendingTimers();

    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });
});
