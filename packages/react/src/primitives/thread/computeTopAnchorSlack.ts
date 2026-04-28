"use client";

export type ComputeTopAnchorTargetOptions = {
  viewport: HTMLElement;
  anchor: HTMLElement;
  fillClampThreshold: number;
  fillClampOffset: number;
};

export type ComputeTopAnchorReserveOptions = ComputeTopAnchorTargetOptions & {
  reserve: HTMLElement;
};

/**
 * Compute the scroll position that pins the anchor (last user message) to the
 * top of the viewport. For tall user messages the anchor is intentionally
 * over-scrolled so only `fillClampOffset` of it remains visible, leaving room
 * for the assistant message below.
 *
 * Depends only on the anchor's offset within the scroll content; never reads
 * `viewport.scrollHeight` (which is volatile while the assistant message
 * streams in).
 */
export const computeTopAnchorTargetScrollTop = ({
  viewport,
  anchor,
  fillClampThreshold,
  fillClampOffset,
}: ComputeTopAnchorTargetOptions): number => {
  const viewportRect = viewport.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const anchorTop = anchorRect.top - viewportRect.top + viewport.scrollTop;
  const anchorHeight = anchorRect.height;
  const visibleAnchorHeight =
    anchorHeight <= fillClampThreshold ? anchorHeight : fillClampOffset;

  return anchorTop + Math.max(0, anchorHeight - visibleAnchorHeight);
};

export const computeTopAnchorSlack = (
  options: ComputeTopAnchorTargetOptions,
): number => {
  const { viewport } = options;
  const targetScrollTop = computeTopAnchorTargetScrollTop(options);
  const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;

  return Math.max(0, targetScrollTop - maxScrollTop);
};

export const computeTopAnchorReserve = ({
  viewport,
  reserve,
  ...targetOptions
}: ComputeTopAnchorReserveOptions): number => {
  const targetScrollTop = computeTopAnchorTargetScrollTop({
    viewport,
    ...targetOptions,
  });
  const scrollHeightWithoutReserve =
    viewport.scrollHeight - reserve.offsetHeight;
  const targetScrollHeight = targetScrollTop + viewport.clientHeight;

  return Math.max(0, targetScrollHeight - scrollHeightWithoutReserve);
};
