export const VW = 200;
export const VH = 120;
export const VIEWBOX = `0 0 ${VW} ${VH}`;

/**
 * Validated categorical order (dataviz six checks, light and dark): assign in
 * this order, never cycled. Single-series charts stay ink with BLUE as the
 * emphasis; POS/NEG is the diverging pair with a neutral midpoint.
 */
export const CAT = ["#3b82f6", "#059669", "#8b5cf6", "#0891b2"] as const;
export const BLUE = "#3b82f6";
export const POS = "#3b82f6";
export const NEG = "#ef4444";

export const seqOpacity = (t: number) =>
  0.12 + 0.78 * Math.max(0, Math.min(1, t));

export type Pt = { x: number; y: number };

export function scale(
  values: number[],
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  min?: number,
  max?: number,
): Pt[] {
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  const step = values.length > 1 ? (x1 - x0) / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: x0 + i * step,
    y: y0 - ((v - lo) / span) * (y0 - y1),
  }));
}

export function linePath(points: Pt[], smooth = true): string {
  if (points.length === 0) return "";
  if (!smooth || points.length < 3) {
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`)
      .join(" ");
  }
  let d = `M${round(points[0]!.x)} ${round(points[0]!.y)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

export function areaPath(points: Pt[], baseY: number, smooth = true): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath(points, smooth)} L${round(last.x)} ${round(baseY)} L${round(first.x)} ${round(baseY)} Z`;
}

export function bandPath(upper: Pt[], lower: Pt[], smooth = true): string {
  const back = [...lower].reverse();
  return `${linePath(upper, smooth)} L${linePath(back, smooth).slice(1)} Z`;
}

export function polar(cx: number, cy: number, r: number, angle: number): Pt {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Annular sector (donut slice). Angles in radians, clockwise from 12 o'clock. */
export function ring(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  a0: number,
  a1: number,
): string {
  const start = a0 - Math.PI / 2;
  const end = a1 - Math.PI / 2;
  const large = end - start > Math.PI ? 1 : 0;
  const o0 = polar(cx, cy, rOuter, start);
  const o1 = polar(cx, cy, rOuter, end);
  const i0 = polar(cx, cy, rInner, end);
  const i1 = polar(cx, cy, rInner, start);
  return [
    `M${round(o0.x)} ${round(o0.y)}`,
    `A${rOuter} ${rOuter} 0 ${large} 1 ${round(o1.x)} ${round(o1.y)}`,
    `L${round(i0.x)} ${round(i0.y)}`,
    `A${rInner} ${rInner} 0 ${large} 0 ${round(i1.x)} ${round(i1.y)}`,
    "Z",
  ].join(" ");
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Bar with the data end rounded and the baseline end square. `end` names the
 * side that carries the value.
 */
export function barPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  end: "right" | "top" | "left" | "bottom",
): string {
  const rr = Math.min(r, w / 2, h / 2);
  switch (end) {
    case "right":
      return `M${round(x)} ${round(y)} H${round(x + w - rr)} A${rr} ${rr} 0 0 1 ${round(x + w)} ${round(y + rr)} V${round(y + h - rr)} A${rr} ${rr} 0 0 1 ${round(x + w - rr)} ${round(y + h)} H${round(x)} Z`;
    case "left":
      return `M${round(x + w)} ${round(y)} H${round(x + rr)} A${rr} ${rr} 0 0 0 ${round(x)} ${round(y + rr)} V${round(y + h - rr)} A${rr} ${rr} 0 0 0 ${round(x + rr)} ${round(y + h)} H${round(x + w)} Z`;
    case "top":
      return `M${round(x)} ${round(y + h)} V${round(y + rr)} A${rr} ${rr} 0 0 1 ${round(x + rr)} ${round(y)} H${round(x + w - rr)} A${rr} ${rr} 0 0 1 ${round(x + w)} ${round(y + rr)} V${round(y + h)} Z`;
    case "bottom":
      return `M${round(x)} ${round(y)} V${round(y + h - rr)} A${rr} ${rr} 0 0 0 ${round(x + rr)} ${round(y + h)} H${round(x + w - rr)} A${rr} ${rr} 0 0 0 ${round(x + w)} ${round(y + h - rr)} V${round(y)} Z`;
  }
}

export const stroke = {
  line: { strokeWidth: 2, vectorEffect: "non-scaling-stroke" },
  medium: { strokeWidth: 1.5, vectorEffect: "non-scaling-stroke" },
  hair: { strokeWidth: 1, vectorEffect: "non-scaling-stroke" },
} as const;

/**
 * Text presets, sized in viewBox units for the subpage render (~3x). Cards hide
 * chart text wholesale via CSS, so nothing here needs to survive thumbnail
 * scale.
 */
export const TXT = {
  axis: { fontSize: 4.5, className: "fill-foreground/40 font-mono" },
  label: { fontSize: 5, className: "fill-foreground/55 font-mono" },
  value: { fontSize: 5, className: "fill-foreground/75 font-mono" },
  onSeries: { fontSize: 4.5, fill: "#fff", opacity: 0.95 },
} as const;

export function Legend({
  x,
  y,
  items,
  anchor = "start",
}: {
  x: number;
  y: number;
  items: { label: string; fill?: string | undefined; className?: string }[];
  anchor?: "start" | "end";
}) {
  const widths = items.map((item) => 8 + item.label.length * 2.9 + 9);
  const total = widths.reduce((sum, w) => sum + w, 0) - 9;
  let cursor = anchor === "end" ? x - total : x;
  return (
    <g data-legend="">
      {items.map((item, i) => {
        const x0 = cursor;
        cursor += widths[i]!;
        return (
          <g key={item.label}>
            <circle
              cx={x0 + 2.4}
              cy={y - 1.6}
              r="2.4"
              {...(item.fill ? { fill: item.fill } : {})}
              className={item.className ?? ""}
            />
            <text x={x0 + 7.6} y={y} {...TXT.axis}>
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
