"use client";

/**
 * Convert a CSS length string (`"10em"`, `"96px"`, `"6rem"`) into pixels,
 * resolving font-relative units against the supplied element's computed style.
 *
 * Part of the top-anchor package's public input contract: consumers may pass
 * clamp configuration as CSS-length strings, and this function is the single
 * place that converts them into the pixel values the package operates on.
 */
export const parseCssLength = (value: string, element: HTMLElement): number => {
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
    return true;
  }

  return false;
};

export const snapScrollTop = (top: number) => {
  const pixelRatio = window.devicePixelRatio || 1;
  return Math.round(top * pixelRatio) / pixelRatio;
};
