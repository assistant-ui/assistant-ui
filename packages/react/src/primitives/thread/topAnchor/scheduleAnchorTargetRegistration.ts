"use client";

import { parseCssLength } from "./topAnchorUtils";

export type AnchorTargetRegistrationStore = {
  getState(): {
    topAnchorMessageClamp: {
      tallerThan: string;
      visibleHeight: string;
    };
    registerAnchorTargetElement: (
      element: HTMLElement | null,
      config?: { tallerThan: number; visibleHeight: number },
    ) => () => void;
  };
};

// rAF-defers the parseCssLength + register so the synchronous getComputedStyle
// inside parseCssLength can't force a layout during bulk-mount of a long thread.
// Returned cleanup is safe before or after the frame fires.
export const scheduleAnchorTargetRegistration = (
  element: HTMLElement,
  store: AnchorTargetRegistrationStore,
): (() => void) => {
  let unregister: (() => void) | undefined;
  let frameHandle: number | null = requestAnimationFrame(() => {
    frameHandle = null;
    const state = store.getState();
    const clamp = state.topAnchorMessageClamp;
    unregister = state.registerAnchorTargetElement(element, {
      tallerThan: parseCssLength(clamp.tallerThan, element),
      visibleHeight: parseCssLength(clamp.visibleHeight, element),
    });
  });

  return () => {
    if (frameHandle !== null) {
      cancelAnimationFrame(frameHandle);
      frameHandle = null;
    }
    unregister?.();
    unregister = undefined;
  };
};
