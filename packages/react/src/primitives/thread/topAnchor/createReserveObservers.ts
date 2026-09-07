"use client";

export type ReserveObserverChange =
  | { type: "resize" }
  | { type: "mutation"; records: readonly MutationRecord[] };

export const createReserveObservers = (
  onChange: (change: ReserveObserverChange) => void,
) => {
  const resizeObserver = new ResizeObserver(() => onChange({ type: "resize" }));
  const mutationObserver = new MutationObserver((records) =>
    onChange({ type: "mutation", records }),
  );

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
