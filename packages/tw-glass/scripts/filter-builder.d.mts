export function buildDisplacementMapSvg(opts?: {
  inset?: number;
  cornerRadius?: number;
  innerBlur?: number;
  outerBlur?: number;
  shape?: "rect" | "circle";
}): string;

export function svgToBase64(svg: string): string;

export function buildStandardFilter(mapBase64: string, scale: number): string;

export function buildChromaticFilter(
  mapBase64: string,
  scale: number,
  rRatio?: number,
  gRatio?: number,
): string;

export function toDataUri(svg: string): string;
