export type Series = { name: string; data: number[] };
export type Item = { label: string; value: number };
export type TreeNode = { label: string; value?: number; children?: TreeNode[] };
export type GraphNode = { id: string; label?: string; group?: number };
export type GraphLink = { source: string; target: string; value?: number };
export type Graph = { nodes: GraphNode[]; links: GraphLink[] };
export type Matrix = { rows: string[]; cols: string[]; values: number[][] };
export type Pt = { x: number; y: number };

/**
 * The contract every chart accepts. `title` names the chart for assistive
 * technology; without it the SVG renders as decorative. `labels` are the
 * category or tick labels along the primary axis; omitting them omits the axis
 * text. `legend` defaults to automatic: shown when two or more series are
 * present. `format` renders numbers wherever the chart prints one.
 */
export type BaseProps = {
  title?: string;
  labels?: string[];
  legend?: boolean;
  format?: (value: number) => string;
  aspect?: number;
  className?: string;
};

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => {
    const fixed = abs >= 100e9 || n >= 100 ? n.toFixed(0) : n.toFixed(1);
    return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
  };
  if (abs >= 1e9) return `${trim(value / 1e9)}b`;
  if (abs >= 1e6) return `${trim(value / 1e6)}m`;
  if (abs >= 1e3) return `${trim(value / 1e3)}k`;
  if (Number.isInteger(value)) return String(value);
  return trim(value);
}
