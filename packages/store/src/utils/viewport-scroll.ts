export type ViewportMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export const isViewportAtBottom = (metrics: ViewportMetrics): boolean =>
  Math.abs(metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight) <=
    1 || metrics.scrollHeight <= metrics.clientHeight;

export const viewportOverflows = (metrics: ViewportMetrics): boolean =>
  metrics.scrollHeight > metrics.clientHeight + 1;

// scrollHeight equality rules out content-driven shifts being misread as a
// user scroll up.
export const isUserScrollUp = (
  previous: { scrollTop: number; scrollHeight: number },
  current: ViewportMetrics,
): boolean =>
  previous.scrollTop > current.scrollTop &&
  previous.scrollHeight === current.scrollHeight;

export const observeContentResize = (
  el: HTMLElement,
  callback: () => void,
): (() => void) => {
  const disposers: (() => void)[] = [];
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => callback());
    resizeObserver.observe(el);
    disposers.push(() => resizeObserver.disconnect());
  }
  if (typeof MutationObserver !== "undefined") {
    const mutationObserver = new MutationObserver((mutations) => {
      // Style-only attribute mutations feed back from code paths that write
      // styles in response to viewport changes.
      const relevant = mutations.some(
        (mutation) =>
          mutation.type !== "attributes" || mutation.attributeName !== "style",
      );
      if (relevant) callback();
    });
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    disposers.push(() => mutationObserver.disconnect());
  }
  return () => {
    for (const dispose of disposers) dispose();
  };
};
