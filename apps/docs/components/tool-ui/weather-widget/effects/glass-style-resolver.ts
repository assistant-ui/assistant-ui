import type { CSSProperties } from "react";

/**
 * `useGlassStyles()` returns an empty object until the element has non-zero
 * dimensions (and the browser supports `backdrop-filter`). In those cases we
 * still want a readable frosted panel, so fall back to a simple blur.
 */
export function resolveGlassBackdropFilterStyles({
  glassStyles,
  blurAmount,
}: {
  glassStyles: CSSProperties;
  blurAmount: number;
}): CSSProperties {
  const svgGlassActive = Boolean((glassStyles as CSSProperties).backdropFilter);
  if (svgGlassActive) return glassStyles;

  const blur = `blur(${blurAmount}px)`;
  return {
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
  };
}
