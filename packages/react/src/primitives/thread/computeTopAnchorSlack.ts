"use client";

export type ComputeTopAnchorSlackOptions = {
  viewport: HTMLElement;
  anchor: HTMLElement;
  fillClampThreshold: number;
  fillClampOffset: number;
};

export const computeTopAnchorTargetScrollTop = ({
  viewport,
  anchor,
  fillClampThreshold,
  fillClampOffset,
}: ComputeTopAnchorSlackOptions): number => {
  const viewportRect = viewport.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const anchorTop = anchorRect.top - viewportRect.top + viewport.scrollTop;
  const anchorHeight = anchorRect.height;
  const visibleAnchorHeight =
    anchorHeight <= fillClampThreshold ? anchorHeight : fillClampOffset;

  return anchorTop + Math.max(0, anchorHeight - visibleAnchorHeight);
};

export const computeTopAnchorSlack = (
  options: ComputeTopAnchorSlackOptions,
): number => {
  const { viewport } = options;
  const targetScrollTop = computeTopAnchorTargetScrollTop(options);
  const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
  const missingScrollRange = targetScrollTop - maxScrollTop;

  return Math.max(0, missingScrollRange);
};
