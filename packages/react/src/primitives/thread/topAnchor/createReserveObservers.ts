"use client";

export const createReserveObservers = (onChange: () => void) => {
  const resizeObserver = new ResizeObserver(onChange);
  const mutationObserver = new MutationObserver(onChange);

  let observedViewport: HTMLElement | null = null;
  let observedAnchor: HTMLElement | null = null;
  let observedTarget: HTMLElement | null = null;

  const disconnect = () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    observedViewport = null;
    observedAnchor = null;
    observedTarget = null;
  };

  return {
    target: (
      viewport: HTMLElement,
      anchor: HTMLElement,
      target: HTMLElement,
    ) => {
      if (
        observedViewport === viewport &&
        observedAnchor === anchor &&
        observedTarget === target
      ) {
        return;
      }

      disconnect();

      resizeObserver.observe(viewport);
      resizeObserver.observe(anchor);
      resizeObserver.observe(target);
      mutationObserver.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      observedViewport = viewport;
      observedAnchor = anchor;
      observedTarget = target;
    },
    disconnect,
  };
};
