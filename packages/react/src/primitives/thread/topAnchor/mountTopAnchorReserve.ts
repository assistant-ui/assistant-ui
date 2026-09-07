"use client";

import {
  computeTopAnchorReserve,
  computeTopAnchorTargetScrollTop,
} from "./computeTopAnchorSlack";
import {
  createReserveObservers,
  type ReserveObserverChange,
} from "./createReserveObservers";
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

  let listenedViewport: HTMLElement | null = null;
  let lastScrollTop = 0;
  let restoreScrollTop: number | null = null;
  let restoredThisTurn = false;
  let lastAppliedTarget: number | null = null;

  const clearRestore = () => {
    restoreScrollTop = null;
    lastAppliedTarget = null;
  };

  const wasPinnedAtLastScroll = () =>
    lastAppliedTarget !== null &&
    Math.abs(lastScrollTop - lastAppliedTarget) <= 1;

  const handleScroll = () => {
    const viewport = listenedViewport;
    if (!viewport) return;
    const scrollTop = viewport.scrollTop;
    const maxScrollTop = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight,
    );
    // A range clamp starts beyond the new maximum and lands on it.
    const isRangeClamp =
      scrollTop < lastScrollTop &&
      lastScrollTop > maxScrollTop + 1 &&
      Math.abs(scrollTop - maxScrollTop) <= 1;

    if (isRangeClamp && wasPinnedAtLastScroll() && !restoredThisTurn) {
      restoreScrollTop ??= lastScrollTop;
      scheduler.schedule();
    }

    lastScrollTop = scrollTop;
  };

  const listenViewport = (viewport: HTMLElement | null) => {
    if (listenedViewport === viewport) return;
    if (listenedViewport) {
      listenedViewport.removeEventListener("scroll", handleScroll);
    }
    listenedViewport = viewport;
    restoredThisTurn = false;
    clearRestore();
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      lastScrollTop = viewport.scrollTop;
    }
  };

  const captureTransientReplacementClamp = (
    records: readonly MutationRecord[],
  ) => {
    // Safari 26 can report a same-task replacement only after the scroll range
    // has recovered, so the exact range-clamp signature is no longer visible.
    if (
      restoredThisTurn ||
      restoreScrollTop !== null ||
      !wasPinnedAtLastScroll() ||
      (typeof CSS !== "undefined" && CSS.supports("overflow-anchor", "auto"))
    ) {
      return;
    }

    const replacedContent = records.some(
      (record) =>
        record.type === "childList" &&
        record.addedNodes.length > 0 &&
        record.removedNodes.length > 0,
    );
    if (!replacedContent) return;

    const state = store.getState();
    const { viewport, anchor } = state.element;
    const clamp = state.targetConfig;
    if (
      state.turnAnchor !== "top" ||
      viewport !== listenedViewport ||
      !anchor ||
      !clamp ||
      viewport.scrollTop >= lastScrollTop
    ) {
      return;
    }

    const maxScrollTop = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight,
    );
    const targetScrollTop = snapScrollTop(
      computeTopAnchorTargetScrollTop({ viewport, anchor, ...clamp }),
    );
    const rangeRecovered = lastScrollTop <= maxScrollTop + 1;
    const targetUnchanged =
      lastAppliedTarget !== null &&
      Math.abs(targetScrollTop - lastAppliedTarget) <= 1;

    if (rangeRecovered && targetUnchanged) {
      restoreScrollTop = lastScrollTop;
    }
  };

  const handleObservedChange = (change: ReserveObserverChange) => {
    if (change.type === "mutation") {
      captureTransientReplacementClamp(change.records);
    }
    scheduler.schedule();
  };

  function apply() {
    const state = store.getState();
    const { viewport, anchor, target } = state.element;
    const clamp = state.targetConfig;

    listenViewport(state.turnAnchor === "top" ? viewport : null);

    if (state.turnAnchor !== "top" || !viewport) {
      observers.disconnect();
      clearRestore();
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
      clearRestore();
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
      clearRestore();
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

    if (anchorId === undefined || anchorId !== lastScrolledAnchorId) {
      restoreScrollTop = null;
      restoredThisTurn = false;
      if (Math.abs(viewport.scrollTop - targetScrollTop) > 1) {
        viewport.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      }
      if (anchorId !== undefined) lastScrolledAnchorId = anchorId;
    } else if (restoreScrollTop !== null && lastAppliedTarget !== null) {
      // Restore the anchor-relative position: if content above the anchor
      // changed height and the browser already adjusted scrollTop to match
      // (scroll anchoring), the desired offset equals the current one and
      // this is a no-op.
      const desired = snapScrollTop(
        restoreScrollTop + (targetScrollTop - lastAppliedTarget),
      );
      restoreScrollTop = null;
      restoredThisTurn = true;
      if (Math.abs(viewport.scrollTop - desired) > 1) {
        viewport.scrollTo({ top: desired, behavior: "instant" });
      }
    }

    lastAppliedTarget = targetScrollTop;
  }

  const scheduler = createFrameScheduler(apply);
  const observers = createReserveObservers(handleObservedChange);

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
