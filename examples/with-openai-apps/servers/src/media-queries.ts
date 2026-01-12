function matchMediaQuery(query: string) {
  return window.matchMedia(query).matches;
}

function createMediaQueryFn(query: string) {
  return () => matchMediaQuery(query);
}

export const prefersReducedMotion = createMediaQueryFn(
  "(prefers-reduced-motion: reduce)"
);

export const isPrimarilyTouchDevice = createMediaQueryFn("(pointer: coarse)");

export const isHoverAvailable = createMediaQueryFn("(hover: hover)");
