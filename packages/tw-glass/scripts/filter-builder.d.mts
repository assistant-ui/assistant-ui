export function buildDisplacementMapSvg(opts?: {
  inset?: number;
  cornerRadius?: number;
  innerBlur?: number;
  outerBlur?: number;
  shape?: "rect" | "circle";
}): string;

export function encodeSvgUrl(svg: string): string;

export function buildStandardFilter(
  mapUrlEncoded: string,
  scale: number,
): string;

export function buildChromaticFilter(
  mapUrlEncoded: string,
  scale: number,
  rRatio?: number,
  gRatio?: number,
): string;

export function toDataUri(svg: string): string;
