"use client";

import { useEffect, type RefObject } from "react";

export function useAutoScrollToChanges(
  ref: RefObject<HTMLElement | null>,
  navKey: unknown,
) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const changed = container.querySelectorAll("[data-changed]");
    if (!changed.length) {
      container.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const first = changed[0]!.getBoundingClientRect();
    const last = changed[changed.length - 1]!.getBoundingClientRect();
    const view = container.getBoundingClientRect();
    const padding = 24;

    let delta = 0;
    if (last.bottom - first.top > view.height)
      delta = first.top - view.top - padding;
    else if (last.bottom > view.bottom)
      delta = last.bottom - view.bottom + padding;
    else if (first.top < view.top) delta = first.top - view.top - padding;
    if (!delta) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.scrollTo({
      top: container.scrollTop + delta,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [ref, navKey]);
}
