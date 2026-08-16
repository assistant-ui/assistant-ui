/**
 * Every color a chart draws resolves through a --dg-* custom property with the
 * shipped default as its fallback, so the package renders correctly with no
 * stylesheet and reskins entirely through tokens. The categorical defaults
 * pass the six palette checks (lightness band, chroma floor, CVD separation,
 * normal-vision floor, contrast) on both light and dark surfaces.
 */
export const C = [
  "var(--dg-c1, #3b82f6)",
  "var(--dg-c2, #059669)",
  "var(--dg-c3, #8b5cf6)",
  "var(--dg-c4, #0891b2)",
  "var(--dg-c5, #d97706)",
  "var(--dg-c6, #db2777)",
  "var(--dg-c7, #65a30d)",
] as const;

export const POS = "var(--dg-pos, #3b82f6)";
export const NEG = "var(--dg-neg, #ef4444)";
export const ACCENT = "var(--dg-c1, #3b82f6)";
export const SURFACE = "var(--dg-surface, transparent)";
export const MUTED =
  "var(--dg-muted, color-mix(in oklab, currentColor 45%, transparent))";
export const GRID =
  "var(--dg-grid, color-mix(in oklab, currentColor 10%, transparent))";
export const FONT = 'var(--dg-font, ui-monospace, "SF Mono", Menlo, monospace)';

export function ink(opacity: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, opacity)) * 100);
  return `color-mix(in oklab, var(--dg-ink, currentColor) ${pct}%, transparent)`;
}

export function cat(index: number): string {
  return C[index % C.length]!;
}

export const seqOpacity = (t: number): number =>
  0.12 + 0.78 * Math.max(0, Math.min(1, t));
