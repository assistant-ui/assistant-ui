"use client";

import {
  computeTopAnchorReserve,
  computeTopAnchorTargetScrollTop,
} from "./computeTopAnchorSlack";
import { createReserveObservers } from "./createReserveObservers";
import {
  createReserveElement,
  getAnchorId,
  setReserveHeight,
  snapScrollTop,
} from "./topAnchorUtils";

/**
 * Minimal slice of `ThreadViewportStore` that the top-anchor reserve needs.
 * Decoupling from the full store keeps `mountTopAnchorReserve` testable in
 * isolation and re-usable from any consumer that can adapt to this shape.
 */
export type TopAnchorStore = {
  getState(): {
    turnAnchor: "top" | "bottom";
    element: {
      viewport: HTMLElement | null;
      anchor: HTMLElement | null;
      target: HTMLElement | null;
    };
    targetConfig: {
      tallerThan: number;
      visibleHeight: number;
    } | null;
    topAnchorTurn: {
      readonly anchorId: string;
      readonly targetId: string;
    } | null;
  };
  subscribe(fn: () => void): () => void;
};

const createFrameScheduler = (fn: () => void) => {
  let frame: number | null = null;

  return {
    schedule: () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        fn();
      });
    },
    cancel: () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
};

export const mountTopAnchorReserve = (store: TopAnchorStore) => {
  let reserve: HTMLElement | null = null;
  let lastScrolledAnchorId: string | undefined;

  // The browser clamps scrollTop synchronously when a transient layout state
  // (e.g. a streamed subtree being swapped for its final render) shrinks
  // scrollHeight below the pinned position; the reserve can only compensate a
  // frame later. Track whether the user has taken over scrolling so the pin
  // can be re-asserted after such layout-induced shifts without ever fighting
  // a user scroll.
  let userTookOver = false;
  let pinScrollTarget: number | null = null;
  let listenedViewport: HTMLElement | null = null;
  let lastScrollTop = 0;
  let lastScrollHeight = 0;

  const releasePin = () => {
    userTookOver = true;
    pinScrollTarget = null;
  };

  const handleScroll = () => {
    const viewport = listenedViewport;
    if (!viewport) return;
    const { scrollTop, scrollHeight } = viewport;
    const stableHeight = scrollHeight === lastScrollHeight;

    if (pinScrollTarget !== null) {
      if (Math.abs(scrollTop - pinScrollTarget) <= 1) {
        pinScrollTarget = null;
      } else if (stableHeight) {
        const approaching =
          Math.abs(pinScrollTarget - scrollTop) <
          Math.abs(pinScrollTarget - lastScrollTop);
        if (!approaching) releasePin();
      }
    } else if (stableHeight && scrollTop !== lastScrollTop) {
      releasePin();
    }

    lastScrollTop = scrollTop;
    lastScrollHeight = scrollHeight;
  };

  const listenViewport = (viewport: HTMLElement | null) => {
    if (listenedViewport === viewport) return;
    if (listenedViewport) {
      listenedViewport.removeEventListener("scroll", handleScroll);
      listenedViewport.removeEventListener("wheel", releasePin);
      listenedViewport.removeEventListener("touchstart", releasePin);
      listenedViewport.removeEventListener("pointerdown", releasePin);
    }
    listenedViewport = viewport;
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      viewport.addEventListener("wheel", releasePin, { passive: true });
      viewport.addEventListener("touchstart", releasePin, { passive: true });
      viewport.addEventListener("pointerdown", releasePin, { passive: true });
      lastScrollTop = viewport.scrollTop;
      lastScrollHeight = viewport.scrollHeight;
    }
  };

  function apply() {
    const state = store.getState();
    const { viewport, anchor, target } = state.element;
    const clamp = state.targetConfig;

    listenViewport(state.turnAnchor === "top" ? viewport : null);

    if (state.turnAnchor !== "top" || !viewport) {
      observers.disconnect();
      if (reserve) {
        setReserveHeight(reserve, 0);
        reserve.remove();
      }
      return;
    }

    if (!anchor && !target && !clamp && state.topAnchorTurn) {
      // ThreadViewport clears this state once the stored pair stops being the
      // trailing turn (followed at most by pending user messages), so reaching
      // here means the anchor gap is transient and the next run is imminent.
      observers.disconnect();
      if (
        reserve?.parentElement &&
        reserve.parentElement.lastElementChild !== reserve
      ) {
        reserve.parentElement.append(reserve);
      }
      return;
    }

    if (!anchor || !target || !clamp) {
      observers.disconnect();
      if (reserve) {
        setReserveHeight(reserve, 0);
        reserve.remove();
      }
      return;
    }

    reserve ??= createReserveElement();

    if (
      reserve.parentElement !== target.parentElement ||
      reserve.previousElementSibling !== target
    ) {
      target.after(reserve);
    }

    observers.target(viewport, anchor, target);

    const reserveChanged = setReserveHeight(
      reserve,
      computeTopAnchorReserve({ viewport, anchor, reserve, ...clamp }),
    );

    if (reserveChanged) {
      scheduler.schedule();
      return;
    }

    const anchorId = getAnchorId(anchor);
    const targetScrollTop = snapScrollTop(
      computeTopAnchorTargetScrollTop({ viewport, anchor, ...clamp }),
    );
    const atTarget = Math.abs(viewport.scrollTop - targetScrollTop) <= 1;
    if (pinScrollTarget !== null && atTarget) pinScrollTarget = null;

    if (anchorId === undefined || anchorId !== lastScrolledAnchorId) {
      userTookOver = false;
      if (!atTarget) {
        pinScrollTarget = targetScrollTop;
        viewport.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      }
      if (anchorId !== undefined) lastScrolledAnchorId = anchorId;
      return;
    }

    if (!userTookOver && pinScrollTarget === null && !atTarget) {
      pinScrollTarget = targetScrollTop;
      viewport.scrollTo({ top: targetScrollTop, behavior: "instant" });
    }
  }

  const scheduler = createFrameScheduler(apply);
  const observers = createReserveObservers(scheduler.schedule);

  scheduler.schedule();
  const unsubscribe = store.subscribe(scheduler.schedule);

  return () => {
    scheduler.cancel();
    unsubscribe();
    observers.disconnect();
    listenViewport(null);
    reserve?.remove();
  };
};
