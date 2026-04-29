"use client";

import {
  TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR,
  TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR,
} from "../ThreadViewportSlack";

const parseCssLength = (value: string, element: HTMLElement): number => {
  const match = value.match(/^([\d.]+)(em|px|rem)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]!);
  const unit = match[2];

  if (unit === "px") return num;
  if (unit === "em") {
    const fontSize = parseFloat(getComputedStyle(element).fontSize) || 16;
    return num * fontSize;
  }
  if (unit === "rem") {
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return num * rootFontSize;
  }
  return 0;
};

export const getClampConfig = (slack: HTMLElement) => {
  const fillClampThreshold =
    slack.getAttribute(TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR) ?? "10em";
  const fillClampOffset =
    slack.getAttribute(TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR) ?? "6em";

  return {
    fillClampThreshold: parseCssLength(fillClampThreshold, slack),
    fillClampOffset: parseCssLength(fillClampOffset, slack),
  };
};

export const getAnchorId = (anchor: HTMLElement) => anchor.dataset.messageId;

export const createReserveElement = () => {
  const reserve = document.createElement("div");
  reserve.dataset.auiTopAnchorReserve = "";
  reserve.style.height = "0px";
  reserve.style.flexShrink = "0";
  reserve.style.pointerEvents = "none";
  reserve.setAttribute("aria-hidden", "true");

  return reserve;
};

export const setReserveHeight = (reserve: HTMLElement, height: number) => {
  const nextHeight = `${height}px`;
  if (reserve.style.height !== nextHeight) {
    reserve.style.height = nextHeight;
  }
};

export const snapScrollTop = (top: number) => {
  const pixelRatio = window.devicePixelRatio || 1;
  return Math.round(top * pixelRatio) / pixelRatio;
};
