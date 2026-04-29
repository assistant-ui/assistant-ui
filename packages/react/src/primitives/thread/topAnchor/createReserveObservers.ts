"use client";

export const createReserveObservers = (onChange: () => void) => {
  const resizeObserver = new ResizeObserver(onChange);
  const mutationObserver = new MutationObserver((mutations) => {
    const hasRelevantMutation = mutations.some(
      (mutation) =>
        mutation.type !== "attributes" || mutation.attributeName !== "style",
    );
    if (hasRelevantMutation) onChange();
  });

  let observedViewport: HTMLElement | null = null;
  let observedAnchor: HTMLElement | null = null;
  let observedSlack: HTMLElement | null = null;

  const disconnect = () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    observedViewport = null;
    observedAnchor = null;
    observedSlack = null;
  };

  return {
    target: (
      viewport: HTMLElement,
      anchor: HTMLElement,
      slack: HTMLElement,
    ) => {
      if (
        observedViewport === viewport &&
        observedAnchor === anchor &&
        observedSlack === slack
      ) {
        return;
      }

      disconnect();

      resizeObserver.observe(viewport);
      resizeObserver.observe(anchor);
      resizeObserver.observe(slack);
      mutationObserver.observe(slack, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      observedViewport = viewport;
      observedAnchor = anchor;
      observedSlack = slack;
    },
    disconnect,
  };
};
