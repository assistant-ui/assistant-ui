"use client";

/**
 * Detects if the current browser is Safari.
 * Used for scroll anchoring fallback since Safari doesn't support CSS overflow-anchor.
 */
export const isSafari = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};
