const DOT_FRAMES = [{ opacity: 0.2 }, { opacity: 0.8 }, { opacity: 0.2 }];

export const PENDING_STYLE = {
  display: "inline-flex",
  gap: "4px",
  padding: "6px 2px",
} as const;

export const PENDING_DOT_STYLE = {
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background: "currentColor",
  opacity: 0.2,
} as const;

/** Pulses the pending indicator's dots in turn, and leaves them still under reduced motion; returns the cleanup. */
export function animatePendingDots(host: Element): () => void {
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    return () => {};
  }
  const animations = Array.from(host.children).flatMap((dot, index) =>
    typeof dot.animate === "function"
      ? [
          dot.animate(DOT_FRAMES, {
            duration: 1200,
            delay: index * 150,
            iterations: Infinity,
          }),
        ]
      : [],
  );
  return () => {
    for (const animation of animations) animation.cancel();
  };
}
