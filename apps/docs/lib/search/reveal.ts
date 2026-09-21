const REVEAL_ATTRIBUTE = "data-search-reveal";
const REVEAL_DURATION_MS = 2400;
const UNLOCK_FRAME_BUDGET = 60;
const SETTLE_FRAME_BUDGET = 150;
const SETTLE_STABLE_FRAMES = 3;
const SETTLE_MOVE_GRACE_FRAMES = 5;

let clearMark: (() => void) | undefined;
let cancelPending: (() => void) | undefined;

function waitFor(
  ready: () => boolean,
  budget: number,
  run: () => void,
): () => void {
  let frames = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    if (frames >= budget || ready()) {
      run();
      return;
    }
    frames += 1;
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  return () => {
    cancelled = true;
  };
}

function isPageScrollLocked(): boolean {
  const html = document.documentElement;
  if (html.hasAttribute("data-base-ui-scroll-locked")) return true;
  return /hidden|clip/.test(getComputedStyle(html).overflowY);
}

function whenScrollSettles(origin: number, run: () => void): () => void {
  let previous = origin;
  let stable = 0;
  let frames = 0;
  let moved = false;

  return waitFor(
    () => {
      const offset = window.scrollY;
      if (offset !== previous) moved = true;
      stable = offset === previous ? stable + 1 : 0;
      previous = offset;
      frames += 1;
      return (
        (moved || frames >= SETTLE_MOVE_GRACE_FRAMES) &&
        stable >= SETTLE_STABLE_FRAMES
      );
    },
    SETTLE_FRAME_BUDGET,
    run,
  );
}

export function clearSearchMark(): void {
  clearMark?.();
}

function markMatch(element: HTMLElement): void {
  element.setAttribute(REVEAL_ATTRIBUTE, "");

  const timer = window.setTimeout(clearSearchMark, REVEAL_DURATION_MS);
  clearMark = () => {
    window.clearTimeout(timer);
    element.removeAttribute(REVEAL_ATTRIBUTE);
    clearMark = undefined;
  };
}

export function revealPageMatch(
  element: HTMLElement,
  block: ScrollLogicalPosition,
): void {
  cancelPending?.();
  clearSearchMark();

  /**
   * A dialog holds the page scroll while it closes: the document is clamped to
   * one viewport and its scroll offset is restored when the lock lifts, so a
   * scroll issued before then is discarded.
   */
  cancelPending = waitFor(
    () => !isPageScrollLocked(),
    UNLOCK_FRAME_BUDGET,
    () => {
      cancelPending = undefined;
      if (!element.isConnected) return;

      const origin = window.scrollY;
      element.scrollIntoView({ block });
      cancelPending = whenScrollSettles(origin, () => {
        cancelPending = undefined;
        markMatch(element);
      });
    },
  );
}
