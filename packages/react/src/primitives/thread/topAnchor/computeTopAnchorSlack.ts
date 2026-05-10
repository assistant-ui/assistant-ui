"use client";

export type ComputeTopAnchorTargetOptions = {
  viewport: HTMLElement;
  anchor: HTMLElement;
  tallerThan: number;
  visibleHeight: number;
};

export type ComputeTopAnchorReserveOptions = ComputeTopAnchorTargetOptions & {
  reserve: HTMLElement;
};

type ComputeTopAnchorSlackOptions = ComputeTopAnchorTargetOptions & {
  scrollHeight: number;
};

const getDocumentOffsetTop = (element: HTMLElement): number => {
  let top = 0;
  let current: HTMLElement | null = element;

  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
};

const getLayoutOffsetTop = (
  element: HTMLElement,
  ancestor: HTMLElement,
): number => {
  // Use layout geometry, not visual rects, so entrance transforms/animations
  // on the anchor do not shift the scroll target while they settle.
  let top = 0;
  let current: HTMLElement | null = element;

  while (current && current !== ancestor) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  if (current === ancestor) return top;

  return getDocumentOffsetTop(element) - getDocumentOffsetTop(ancestor);
};

/**
 * Compute the scroll position that pins the anchor (last user message) to the
 * top of the viewport. For tall user messages the anchor is intentionally
 * over-scrolled so only `visibleHeight` of it remains visible, leaving room
 * for the assistant message below.
 *
 * Depends only on the anchor's offset within the scroll content; never reads
 * `viewport.scrollHeight` (which is volatile while the assistant message
 * streams in).
 */
export const computeTopAnchorTargetScrollTop = ({
  viewport,
  anchor,
  tallerThan,
  visibleHeight,
}: ComputeTopAnchorTargetOptions): number => {
  const anchorTop = getLayoutOffsetTop(anchor, viewport);
  const anchorHeight = anchor.offsetHeight;
  const visibleAnchorHeight =
    anchorHeight <= tallerThan ? anchorHeight : visibleHeight;

  return anchorTop + Math.max(0, anchorHeight - visibleAnchorHeight);
};

const computeTopAnchorSlack = ({
  scrollHeight,
  ...targetOptions
}: ComputeTopAnchorSlackOptions): number => {
  const { viewport } = targetOptions;
  const targetScrollTop = computeTopAnchorTargetScrollTop(targetOptions);
  const targetScrollHeight = targetScrollTop + viewport.clientHeight;

  return Math.max(0, targetScrollHeight - scrollHeight);
};

export const computeTopAnchorReserve = ({
  viewport,
  reserve,
  ...targetOptions
}: ComputeTopAnchorReserveOptions): number => {
  return computeTopAnchorSlack({
    viewport,
    ...targetOptions,
    scrollHeight: viewport.scrollHeight - reserve.offsetHeight,
  });
};
