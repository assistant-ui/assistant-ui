export type ViewportMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/**
 * With a content inset, positions within `contentInset` of the native bottom
 * count as at bottom: content that close is only obscured by the inset
 * element itself, so the viewport is still treated as pinned.
 */
export const isViewportAtBottom = (
  metrics: ViewportMetrics,
  contentInset = 0,
): boolean => {
  if (contentInset === 0) {
    return (
      Math.abs(
        metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight,
      ) <= 1 || metrics.scrollHeight <= metrics.clientHeight
    );
  }

  return (
    metrics.scrollHeight -
      contentInset -
      metrics.scrollTop -
      metrics.clientHeight <=
      1 || metrics.scrollHeight - contentInset <= metrics.clientHeight
  );
};

export const viewportOverflows = (
  metrics: ViewportMetrics,
  contentInset = 0,
): boolean => {
  if (contentInset === 0) {
    return metrics.scrollHeight > metrics.clientHeight + 1;
  }

  return metrics.scrollHeight - contentInset > metrics.clientHeight + 1;
};

// scrollHeight equality rules out content-driven shifts being misread as a
// user scroll up.
export const isUserScrollUp = (
  previous: { scrollTop: number; scrollHeight: number },
  current: ViewportMetrics,
): boolean =>
  previous.scrollTop > current.scrollTop &&
  previous.scrollHeight === current.scrollHeight;

// `instanceof Element` is false for a node created in another frame's realm.
const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE;

export const observeContentResize = (
  el: HTMLElement,
  callback: () => void,
): (() => void) => {
  const disposers: (() => void)[] = [];
  const resizeObserver =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => callback())
      : null;
  if (resizeObserver) {
    resizeObserver.observe(el);
    // Content can grow without a DOM mutation (a CSS height animation, an
    // image or font loading, an autosizing textarea), and the viewport's own
    // box does not change when it does; only its children's sizes show it.
    for (const child of el.children) resizeObserver.observe(child);
    disposers.push(() => resizeObserver.disconnect());
  }
  if (typeof MutationObserver !== "undefined") {
    const mutationObserver = new MutationObserver((mutations) => {
      if (resizeObserver) {
        for (const mutation of mutations) {
          if (mutation.target !== el) continue;
          for (const node of mutation.addedNodes) {
            if (isElement(node)) resizeObserver.observe(node);
          }
          for (const node of mutation.removedNodes) {
            if (isElement(node)) resizeObserver.unobserve(node);
          }
        }
      }
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
