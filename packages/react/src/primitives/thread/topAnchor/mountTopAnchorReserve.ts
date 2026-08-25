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

const USER_GESTURE_WINDOW_MS = 500;
const SCROLL_TRAIN_GAP_MS = 150;

export const mountTopAnchorReserve = (store: TopAnchorStore) => {
  let reserve: HTMLElement | null = null;
  let lastScrolledAnchorId: string | undefined;

  // A transient layout state that shrinks scrollHeight (e.g. a streamed
  // subtree swapped for its final rendering) makes the browser clamp
  // scrollTop synchronously, before the reserve can grow to compensate;
  // WebKit lays such states out where Chromium happens not to, which turned
  // the clamp into a permanently broken pin. The clamp is undone by
  // restoring the pre-clamp position once the reserve has settled. A
  // scrollTop decrease is attributed to the user — and left alone — while a
  // scroll gesture is held or recent, or while an uninterrupted scroll train
  // started by one is still running (touch momentum outlives its input
  // events). The upward restore and the downward smooth pin never match the
  // "unattributed decrease" trigger, so the mechanism cannot feed itself.
  let listenedViewport: HTMLElement | null = null;
  let lastScrollTop = 0;
  let lastScrollAt = -Infinity;
  let lastGestureAt = -Infinity;
  let gestureHeld = false;
  let userScrollTrain = false;
  let restoreScrollTop: number | null = null;

  const onGesture = () => {
    lastGestureAt = performance.now();
  };
  const onGestureStart = () => {
    lastGestureAt = performance.now();
    gestureHeld = true;
  };
  const onGestureEnd = () => {
    lastGestureAt = performance.now();
    gestureHeld = false;
  };

  const handleScroll = () => {
    const viewport = listenedViewport;
    if (!viewport) return;
    const now = performance.now();
    const scrollTop = viewport.scrollTop;

    if (scrollTop !== lastScrollTop) {
      const userAttributed =
        gestureHeld ||
        now - lastGestureAt < USER_GESTURE_WINDOW_MS ||
        (userScrollTrain && now - lastScrollAt < SCROLL_TRAIN_GAP_MS);

      if (userAttributed) {
        userScrollTrain = true;
        restoreScrollTop = null;
      } else {
        userScrollTrain = false;
        if (scrollTop < lastScrollTop) {
          restoreScrollTop ??= lastScrollTop;
          scheduler.schedule();
        }
      }
    }

    lastScrollAt = now;
    lastScrollTop = scrollTop;
  };

  const listenViewport = (viewport: HTMLElement | null) => {
    if (listenedViewport === viewport) return;
    if (listenedViewport) {
      listenedViewport.removeEventListener("scroll", handleScroll);
      listenedViewport.removeEventListener("wheel", onGesture);
      listenedViewport.removeEventListener("keydown", onGesture);
      listenedViewport.removeEventListener("touchstart", onGestureStart);
      listenedViewport.removeEventListener("pointerdown", onGestureStart);
      window.removeEventListener("touchend", onGestureEnd);
      window.removeEventListener("touchcancel", onGestureEnd);
      window.removeEventListener("pointerup", onGestureEnd);
      window.removeEventListener("pointercancel", onGestureEnd);
    }
    listenedViewport = viewport;
    gestureHeld = false;
    userScrollTrain = false;
    restoreScrollTop = null;
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      viewport.addEventListener("wheel", onGesture, { passive: true });
      viewport.addEventListener("keydown", onGesture, { passive: true });
      viewport.addEventListener("touchstart", onGestureStart, {
        passive: true,
      });
      viewport.addEventListener("pointerdown", onGestureStart, {
        passive: true,
      });
      window.addEventListener("touchend", onGestureEnd, { passive: true });
      window.addEventListener("touchcancel", onGestureEnd, { passive: true });
      window.addEventListener("pointerup", onGestureEnd, { passive: true });
      window.addEventListener("pointercancel", onGestureEnd, {
        passive: true,
      });
      lastScrollTop = viewport.scrollTop;
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

    if (restoreScrollTop !== null) {
      const top = restoreScrollTop;
      restoreScrollTop = null;
      viewport.scrollTo({ top, behavior: "instant" });
    }

    const anchorId = getAnchorId(anchor);
    if (anchorId !== undefined && lastScrolledAnchorId === anchorId) return;

    const targetScrollTop = snapScrollTop(
      computeTopAnchorTargetScrollTop({ viewport, anchor, ...clamp }),
    );

    if (Math.abs(viewport.scrollTop - targetScrollTop) > 1) {
      viewport.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    }

    if (anchorId !== undefined) lastScrolledAnchorId = anchorId;
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
