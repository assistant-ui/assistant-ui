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
  if (typeof ResizeObserver === "undefined") return () => {};
  const resizeObserver = new ResizeObserver(() => callback());
  const mutationObserver = new MutationObserver((mutations) => {
    // Style-only attribute mutations feed back from code paths that write
    // styles in response to viewport changes.
    const relevant = mutations.some(
      (mutation) =>
        mutation.type !== "attributes" || mutation.attributeName !== "style",
    );
    if (relevant) callback();
  });
  resizeObserver.observe(el);
  mutationObserver.observe(el, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
};
