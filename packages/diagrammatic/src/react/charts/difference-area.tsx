import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { type TickSpec, resolveTicks, upperBound } from "../../core/scale";
import type { Guide, Pt, Series } from "../../core/types";
import {
  type CubicSegment,
  bandPath,
  lineCubicSegment,
  linePath,
  linear,
  round,
  stroke,
} from "../../core/geometry";
import { textWidth } from "../../core/text";
import { GRID, NEG, POS, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  Guides,
  PAD,
  SvgLegend,
  TickGrid,
  frame,
} from "../svg";

export type DifferenceAreaProps = BaseProps & {
  actual: Series;
  reference: Series;
  yTicks?: TickSpec;
  guides?: readonly Guide[];
  regions?: { from: number; to: number; label?: string }[];
};

const mix = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

function splitCubic(c: CubicSegment, t: number): [CubicSegment, CubicSegment] {
  const a = mix(c.start, c.control1, t);
  const b = mix(c.control1, c.control2, t);
  const d = mix(c.control2, c.end, t);
  const e = mix(a, b, t);
  const f = mix(b, d, t);
  const middle = mix(e, f, t);
  return [
    { start: c.start, control1: a, control2: e, end: middle },
    { start: middle, control1: f, control2: d, end: c.end },
  ];
}

function cubicSection(c: CubicSegment, from: number, to: number): CubicSegment {
  const first = to === 1 ? c : splitCubic(c, to)[0];
  return from === 0 ? first : splitCubic(first, from / to)[1];
}

function cubicCrossings(
  actual: CubicSegment,
  reference: CubicSegment,
): number[] {
  const values = [
    actual.start.y - reference.start.y,
    actual.control1.y - reference.control1.y,
    actual.control2.y - reference.control2.y,
    actual.end.y - reference.end.y,
  ];
  const [v0, v1, v2, v3] = values as [number, number, number, number];
  const a = -v0 + 3 * v1 - 3 * v2 + v3;
  const b = 3 * v0 - 6 * v1 + 3 * v2;
  const c = -3 * v0 + 3 * v1;
  const valueAt = (t: number) => ((a * t + b) * t + c) * t + v0;
  const stops = [0, 1];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) >= 1e-12) stops.push(-c / (2 * b));
  } else {
    const discriminant = b * b - 3 * a * c;
    if (discriminant > 0) {
      const root = Math.sqrt(discriminant);
      stops.push((-b - root) / (3 * a), (-b + root) / (3 * a));
    }
  }
  const ordered = stops.filter((t) => t >= 0 && t <= 1).sort((x, y) => x - y);
  const roots: number[] = [];
  for (let i = 0; i + 1 < ordered.length; i += 1) {
    let lo = ordered[i]!;
    let hi = ordered[i + 1]!;
    const loValue = valueAt(lo);
    if (loValue * valueAt(hi) >= 0) continue;
    for (let step = 0; step < 50; step += 1) {
      const mid = (lo + hi) / 2;
      if (loValue * valueAt(mid) > 0) lo = mid;
      else hi = mid;
    }
    const root = (lo + hi) / 2;
    if (root > 0 && root < 1) roots.push(root);
  }
  return roots;
}

type BandRun = { actual: CubicSegment[]; reference: CubicSegment[] };

function bandRunPath(run: BandRun, actualAbove: boolean): string {
  const upper = actualAbove ? run.actual : run.reference;
  const lower = actualAbove ? run.reference : run.actual;
  const start = upper[0]!.start;
  let path = `M${round(start.x)} ${round(start.y)}`;
  for (const segment of upper) {
    path += ` C${round(segment.control1.x)} ${round(segment.control1.y)} ${round(segment.control2.x)} ${round(segment.control2.y)} ${round(segment.end.x)} ${round(segment.end.y)}`;
  }
  const last = lower[lower.length - 1]!.end;
  path += ` L${round(last.x)} ${round(last.y)}`;
  for (let i = lower.length - 1; i >= 0; i -= 1) {
    const segment = lower[i]!;
    path += ` C${round(segment.control2.x)} ${round(segment.control2.y)} ${round(segment.control1.x)} ${round(segment.control1.y)} ${round(segment.start.x)} ${round(segment.start.y)}`;
  }
  return `${path} Z`;
}

function splitDifferenceBands(
  actual: Pt[],
  reference: Pt[],
  fallback: [string, string],
): [string, string] {
  if (
    actual.length < 2 ||
    actual.some((point, i) => point.x !== reference[i]?.x)
  ) {
    return fallback;
  }
  const positive: BandRun[] = [];
  const negative: BandRun[] = [];
  let previousSign = 0;
  for (let i = 0; i + 1 < actual.length; i += 1) {
    const actualCurve = lineCubicSegment(actual, i);
    const referenceCurve = lineCubicSegment(reference, i);
    const cuts = [0, ...cubicCrossings(actualCurve, referenceCurve), 1];
    for (let j = 0; j + 1 < cuts.length; j += 1) {
      const from = cuts[j]!;
      const to = cuts[j + 1]!;
      const actualPart = cubicSection(actualCurve, from, to);
      const referencePart = cubicSection(referenceCurve, from, to);
      const midpoint =
        cubicSection(actualCurve, from, (from + to) / 2).end.y -
        cubicSection(referenceCurve, from, (from + to) / 2).end.y;
      const sign = Math.sign(midpoint);
      if (sign === 0) {
        previousSign = 0;
        continue;
      }
      const runs = sign < 0 ? positive : negative;
      if (sign !== previousSign) runs.push({ actual: [], reference: [] });
      runs[runs.length - 1]!.actual.push(actualPart);
      runs[runs.length - 1]!.reference.push(referencePart);
      previousSign = sign;
    }
  }
  if (positive.length === 0 || negative.length === 0) return fallback;
  return [
    positive.map((run) => bandRunPath(run, true)).join(" "),
    negative.map((run) => bandRunPath(run, false)).join(" "),
  ];
}

export const DifferenceArea = forwardRef<SVGSVGElement, DifferenceAreaProps>(
  (
    {
      actual,
      reference,
      yTicks,
      guides,
      regions,
      format = formatCompact,
      labels,
      legend,
      title,
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const max = upperBound([...actual.data, ...reference.data], yTicks, guides);
    const yTickList = resolveTicks(yTicks, 0, max, "linear", format);
    const showLegend = legend !== false;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      labels: Boolean(labels),
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = linear(0, max, bottom, top);
    const length = Math.max(actual.data.length, reference.data.length);
    const count = Math.max(1, length - 1);
    const X = (i: number) =>
      left + (Math.max(0, Math.min(count, i)) / count) * (right - left);
    const along = (values: number[]) =>
      values.map((value, i) => ({
        x: X(i),
        y: Y(value),
      }));
    const a = along(actual.data);
    const b = along(reference.data);
    const sharedCount = Math.min(a.length, b.length);
    const sharedActual = a.slice(0, sharedCount);
    const sharedReference = b.slice(0, sharedCount);
    const above = sharedActual.map((p, i) => ({
      x: p.x,
      y: Math.min(p.y, sharedReference[i]!.y),
    }));
    const below = sharedActual.map((p, i) => ({
      x: p.x,
      y: Math.max(p.y, sharedReference[i]!.y),
    }));
    const [positivePath, negativePath] = splitDifferenceBands(
      sharedActual,
      sharedReference,
      [bandPath(above, sharedReference), bandPath(sharedReference, below)],
    );
    const actualEnd = a[a.length - 1];
    const referenceEnd = b[b.length - 1];
    const actualLabel = format(actual.data[actual.data.length - 1] ?? 0);
    const referenceLabel = format(
      reference.data[reference.data.length - 1] ?? 0,
    );
    const endX = (label: string, point: { x: number } | undefined) =>
      point
        ? Math.min(point.x, F.width - PAD - textWidth(label, T.value.px) / 2)
        : 0;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <TickGrid
          ticks={yTickList}
          at={Y}
          from={left}
          to={right}
          type={T.axis}
        />
        {regions?.map((region) => (
          <g
            key={`${region.from}-${region.to}`}
            data-part="region"
            data-series={region.label}
          >
            <rect
              x={round(X(region.from))}
              y={top - 4}
              width={round(Math.max(0, X(region.to) - X(region.from)))}
              height={round(bottom - top + 4)}
              fill={ink(0.07)}
            />
            {region.label ? (
              <text
                x={round(X(region.from)) + 5}
                y={round(top + T.label.px - 2)}
                {...T.label.attrs}
              >
                {region.label}
              </text>
            ) : null}
          </g>
        ))}
        <Guides
          guides={guides}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <ColumnHits
          count={length}
          x0={left}
          x1={right}
          top={top}
          bottom={bottom}
        />
        <path d={positivePath} fill={POS} opacity="0.22" data-part="mark" />
        <path d={negativePath} fill={NEG} opacity="0.22" data-part="mark" />
        <path
          d={linePath(b)}
          fill="none"
          stroke={ink(0.4)}
          strokeDasharray="4 4"
          data-part="mark"
          data-series={reference.name}
          {...stroke.hair}
        />
        <path
          d={linePath(a)}
          fill="none"
          stroke={ink(0.75)}
          data-part="mark"
          data-series={actual.name}
          {...stroke.line}
        />
        {actualEnd && (
          <text
            x={round(endX(actualLabel, actualEnd))}
            y={round(actualEnd.y - 7)}
            textAnchor="middle"
            {...T.value.attrs}
            fill={ink(0.75)}
          >
            {actualLabel}
          </text>
        )}
        {referenceEnd && (
          <text
            x={round(endX(referenceLabel, referenceEnd))}
            y={round(referenceEnd.y - 7)}
            textAnchor="middle"
            {...T.value.attrs}
            fill={ink(0.4)}
          >
            {referenceLabel}
          </text>
        )}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={[actual.name, reference.name, "ahead", "behind"]}
            colors={[ink(0.75), ink(0.4), POS, NEG]}
          />
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

DifferenceArea.displayName = "DifferenceArea";
