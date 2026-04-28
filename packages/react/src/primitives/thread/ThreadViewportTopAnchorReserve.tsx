"use client";

import { useLayoutEffect, type FC } from "react";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import {
  computeTopAnchorReserve,
  computeTopAnchorTargetScrollTop,
} from "./computeTopAnchorSlack";
import {
  TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR,
  TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR,
} from "./ThreadViewportSlack";

const ANCHORED_MESSAGE_IDS = new WeakMap<object, Set<string>>();

const getAnchoredMessageIds = (key: object) => {
  let ids = ANCHORED_MESSAGE_IDS.get(key);
  if (!ids) {
    ids = new Set();
    ANCHORED_MESSAGE_IDS.set(key, ids);
  }
  return ids;
};

const parseCssLength = (value: string, element: HTMLElement): number => {
  const match = value.match(/^([\d.]+)(em|px|rem)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]!);
  const unit = match[2];

  if (unit === "px") return num;
  if (unit === "em") {
    const fontSize = parseFloat(getComputedStyle(element).fontSize) || 16;
    return num * fontSize;
  }
  if (unit === "rem") {
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return num * rootFontSize;
  }
  return 0;
};

const getClampConfig = (slack: HTMLElement) => {
  const fillClampThreshold =
    slack.getAttribute(TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR) ?? "10em";
  const fillClampOffset =
    slack.getAttribute(TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR) ?? "6em";

  return {
    fillClampThreshold: parseCssLength(fillClampThreshold, slack),
    fillClampOffset: parseCssLength(fillClampOffset, slack),
  };
};

const getAnchorId = (anchor: HTMLElement) => anchor.dataset.messageId;

export const ThreadPrimitiveViewportTopAnchorReserve: FC = () => {
  const threadViewportStore = useThreadViewportStore({ optional: true });

  useLayoutEffect(() => {
    if (!threadViewportStore) return;

    const store = threadViewportStore;
    const anchoredIds = getAnchoredMessageIds(store);
    const reserve = document.createElement("div");

    let frame: number | null = null;
    let observedSlack: HTMLElement | null = null;
    let observedAnchor: HTMLElement | null = null;
    let observedViewport: HTMLElement | null = null;

    const resizeObserver = new ResizeObserver(() => scheduleApply());
    const mutationObserver = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some(
        (m) => m.type !== "attributes" || m.attributeName !== "style",
      );
      if (hasRelevantMutation) scheduleApply();
    });

    const setReserveHeight = (height: number) => {
      const nextHeight = `${height}px`;
      if (reserve.style.height !== nextHeight) {
        reserve.style.height = nextHeight;
      }
    };

    const clearActiveReserve = () => {
      observedSlack = null;
      observedAnchor = null;
      observedViewport = null;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      setReserveHeight(0);
      reserve.remove();
    };

    const observeActiveElements = (
      viewport: HTMLElement,
      anchor: HTMLElement,
      slack: HTMLElement,
    ) => {
      if (
        observedViewport === viewport &&
        observedSlack === slack &&
        observedAnchor === anchor
      ) {
        return;
      }

      resizeObserver.disconnect();
      mutationObserver.disconnect();

      resizeObserver.observe(viewport);
      resizeObserver.observe(anchor);
      resizeObserver.observe(slack);
      mutationObserver.observe(slack, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      observedViewport = viewport;
      observedSlack = slack;
      observedAnchor = anchor;
    };

    const apply = () => {
      frame = null;

      const state = store.getState();
      const { viewport, anchor, slack } = state.element;

      if (state.turnAnchor !== "top" || !viewport || !anchor || !slack) {
        clearActiveReserve();
        return;
      }

      if (reserve.parentElement !== slack.parentElement) {
        slack.after(reserve);
      } else if (reserve.previousElementSibling !== slack) {
        slack.after(reserve);
      }

      observeActiveElements(viewport, anchor, slack);

      const clamp = getClampConfig(slack);
      const reserveHeight = computeTopAnchorReserve({
        viewport,
        anchor,
        reserve,
        ...clamp,
      });
      setReserveHeight(reserveHeight);

      const anchorId = getAnchorId(anchor);
      if (anchorId !== undefined && anchoredIds.has(anchorId)) {
        return;
      }

      const targetScrollTop = computeTopAnchorTargetScrollTop({
        viewport,
        anchor,
        ...clamp,
      });

      if (Math.abs(viewport.scrollTop - targetScrollTop) > 1) {
        viewport.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      }

      if (anchorId !== undefined) {
        anchoredIds.add(anchorId);
      }
    };

    function scheduleApply() {
      if (frame !== null) return;
      frame = requestAnimationFrame(apply);
    }

    reserve.dataset.auiTopAnchorReserve = "";
    reserve.style.height = "0px";
    reserve.style.flexShrink = "0";
    reserve.style.pointerEvents = "none";
    reserve.setAttribute("aria-hidden", "true");

    scheduleApply();
    const unsubscribe = store.subscribe(scheduleApply);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      unsubscribe();
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      reserve.remove();
    };
  }, [threadViewportStore]);

  return null;
};

ThreadPrimitiveViewportTopAnchorReserve.displayName =
  "ThreadPrimitive.ViewportTopAnchorReserve";
