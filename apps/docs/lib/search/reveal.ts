const REVEAL_ATTRIBUTE = "data-search-reveal";
const REVEAL_DURATION_MS = 2400;
const UNLOCK_FRAME_BUDGET = 60;
const SETTLE_FRAME_BUDGET = 150;
const SETTLE_STABLE_FRAMES = 3;

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

function isInView(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

function whenScrollSettles(expectMove: boolean, run: () => void): () => void {
  let previous = Number.NaN;
  let stable = 0;
  let moved = !expectMove;

  return waitFor(
    () => {
      const offset = window.scrollY;
      if (!Number.isNaN(previous) && offset !== previous) moved = true;
      stable = offset === previous ? stable + 1 : 0;
      previous = offset;
      return moved && stable >= SETTLE_STABLE_FRAMES;
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

      const expectMove = !isInView(element);
      element.scrollIntoView({ block });
      cancelPending = whenScrollSettles(expectMove, () => {
        cancelPending = undefined;
        markMatch(element);
      });
    },
  );
}
