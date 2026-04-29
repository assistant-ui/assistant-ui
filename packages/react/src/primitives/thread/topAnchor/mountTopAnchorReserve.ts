"use client";

import {
  computeTopAnchorReserve,
  computeTopAnchorTargetScrollTop,
} from "./computeTopAnchorSlack";
import { createReserveObservers } from "./createReserveObservers";
import {
  createReserveElement,
  getAnchorId,
  getClampConfig,
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
      slack: HTMLElement | null;
    };
  };
  subscribe(fn: () => void): () => void;
};

const ANCHORED_MESSAGE_IDS = new WeakMap<object, Set<string>>();

const getAnchoredMessageIds = (key: object) => {
  let ids = ANCHORED_MESSAGE_IDS.get(key);
  if (!ids) {
    ids = new Set();
    ANCHORED_MESSAGE_IDS.set(key, ids);
  }
  return ids;
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
  const reserve = createReserveElement();
  const anchoredIds = getAnchoredMessageIds(store);

  function apply() {
    const state = store.getState();
    const { viewport, anchor, slack } = state.element;

    if (state.turnAnchor !== "top" || !viewport || !anchor || !slack) {
      observers.disconnect();
      setReserveHeight(reserve, 0);
      reserve.remove();
      return;
    }

    if (
      reserve.parentElement !== slack.parentElement ||
      reserve.previousElementSibling !== slack
    ) {
      slack.after(reserve);
    }

    observers.target(viewport, anchor, slack);

    const clamp = getClampConfig(slack);
    setReserveHeight(
      reserve,
      computeTopAnchorReserve({ viewport, anchor, reserve, ...clamp }),
    );

    const anchorId = getAnchorId(anchor);
    if (anchorId !== undefined && anchoredIds.has(anchorId)) return;

    const targetScrollTop = snapScrollTop(
      computeTopAnchorTargetScrollTop({ viewport, anchor, ...clamp }),
    );

    if (Math.abs(viewport.scrollTop - targetScrollTop) > 1) {
      viewport.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    }

    if (anchorId !== undefined) anchoredIds.add(anchorId);
  }

  const scheduler = createFrameScheduler(apply);
  const observers = createReserveObservers(scheduler.schedule);

  scheduler.schedule();
  const unsubscribe = store.subscribe(scheduler.schedule);

  return () => {
    scheduler.cancel();
    unsubscribe();
    observers.disconnect();
    reserve.remove();
  };
};
