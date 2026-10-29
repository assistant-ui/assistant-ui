import type { BaseProps } from "../svg";
import { Pulse } from "../motion";
import { forwardRef, useId } from "react";
import {
  type TickSpec,
  resolveTicks,
  tickValues,
  wantsTicks,
} from "../../core/scale";
import type { Guide, Pt, ScaleKind, Series } from "../../core/types";
import { formatCompact } from "../../core/types";
import {
  bandPath,
  lineCubicSegment,
  linePath,
  linearFit,
  positiveExtent,
  project,
  round,
  stepPath,
  stroke,
} from "../../core/geometry";
import { textWidth } from "../../core/text";
import { ACCENT, GRID, NEG, POS, cat, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  Guides,
  PAD,
  SvgLegend,
  TickGrid,
  frame,
  hitRadius,
  labelXs,
} from "../svg";

export type LineMark = {
  at: number;
  series?: string;
  label?: string;
  kind?: "point" | "censor";
};

export type LineProps = BaseProps & {
  data?: number[];
  series?: Series[];
  xs?: number[];
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  yMax?: number;
  xTicks?: TickSpec;
  yTicks?: TickSpec;
  step?: boolean;
  signed?: boolean;
  forecastFrom?: number;
  trend?: boolean;
  regions?: { from: number; to: number; label?: string }[];
  bands?: readonly { lower: number[]; upper: number[] }[];
  marks?: readonly LineMark[];
  guides?: readonly Guide[];
};

function xDomain(
  xs: number[] | undefined,
  extra: number[],
  lastIndex: number,
  xScale: ScaleKind,
): [number, number] {
  if (!xs?.length) return [0, lastIndex];
  const values = [...xs, ...extra];
  return xScale === "log"
    ? positiveExtent(values)
    : [Math.min(...values), Math.max(...values)];
}

function linePoints(
  values: number[],
  left: number,
  right: number,
  Y: (v: number) => number,
  xs: number[] | undefined,
  X: (v: number) => number,
): Pt[] {
  const n = values.length;
  return values.map((v, i) => ({
    x: xs ? X(xs[i] ?? i) : left + (n > 1 ? (i / (n - 1)) * (right - left) : 0),
    y: Y(v),
  }));
}

function lineRangePath(pts: Pt[], from: number, to: number, step: boolean) {
  const start = pts[from]!;
  let d = `M${round(start.x)} ${round(start.y)}`;
  for (let i = from; i < to; i += 1) {
    const next = pts[i + 1]!;
    if (step) {
      d += ` H${round(next.x)} V${round(next.y)}`;
    } else if (pts.length < 3) {
      d += ` L${round(next.x)} ${round(next.y)}`;
    } else {
      const { control1, control2 } = lineCubicSegment(pts, i);
      d += ` C${round(control1.x)} ${round(control1.y)} ${round(control2.x)} ${round(control2.y)} ${round(next.x)} ${round(next.y)}`;
    }
  }
  return d;
}

export const Line = forwardRef<SVGSVGElement, LineProps>(
  (
    {
      data,
      series,
      xs,
      xScale = "linear",
      yScale = "linear",
      yMax,
      xTicks,
      yTicks,
      step,
      signed,
      forecastFrom,
      trend,
      regions,
      bands,
      marks,
      guides,
      labels,
      legend,
      format = formatCompact,
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
    const all: Series[] = series ?? [{ name: "", data: data ?? [] }];
    const multi = all.length > 1;
    const showLegend = legend ?? multi;
    const yValues = [
      ...all.flatMap((s) => s.data),
      ...(bands?.flatMap((band) => [...band.lower, ...band.upper]) ?? []),
      ...tickValues(yTicks),
      ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
        []),
    ];
    const [yLo0, yHi0] =
      yScale === "log"
        ? positiveExtent(yValues)
        : [Math.min(0, ...yValues), Math.max(...yValues, 1)];
    const yHi = yMax ?? yHi0;
    const yTickList = resolveTicks(yTicks, yLo0, yHi, yScale, format);
    const lastIndex = Math.max(0, (all[0]?.data.length ?? 1) - 1);
    const [xLo, xHi] = xDomain(
      xs,
      [
        ...tickValues(xTicks),
        ...(guides?.filter((g) => g.axis === "x").map((g) => g.at) ?? []),
      ],
      lastIndex,
      xScale,
    );
    const xTickList = resolveTicks(xTicks, xLo, xHi, xScale, format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      labels: Boolean(labels) || wantsTicks(xTicks),
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = project(yScale, yLo0, yHi, bottom, top);
    const X = project(xScale, xLo, xHi, left, right);
    const grids = all.map((s) => linePoints(s.data, left, right, Y, xs, X));
    const first = grids[0] ?? [];
    const last = first[first.length - 1];
    const lastValue = all[0]?.data[all[0].data.length - 1] ?? 0;
    const signedSingle = Boolean(signed && !multi && yScale !== "log");
    const clipId = useId();
    const endColor = signedSingle ? (lastValue < 0 ? NEG : POS) : ACCENT;
    const forecastIndex =
      forecastFrom === undefined || Number.isNaN(forecastFrom)
        ? undefined
        : Math.round(forecastFrom);
    const count = Math.max(1, (all[0]?.data.length ?? 1) - 1);
    const span = right - left;
    const RX = (i: number) =>
      left + (Math.max(0, Math.min(count, i)) / count) * span;
    const hit = hitRadius(span, count);
    const endLabel = format(lastValue);
    const endX = last
      ? Math.min(last.x, F.width - PAD - textWidth(endLabel, T.value.px) / 2)
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
        <TickGrid
          ticks={xTickList}
          at={X}
          from={top}
          to={bottom}
          axis="x"
          labelAt={axisY}
          type={T.axis}
        />
        {bands?.map((band, i) => (
          <path
            key={`band-${i}`}
            d={bandPath(
              linePoints(band.upper, left, right, Y, xs, X),
              linePoints(band.lower, left, right, Y, xs, X),
            )}
            fill={ink(0.12 - Math.min(i, 2) * 0.03)}
            data-part="band"
          />
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
        {regions?.map((region) => (
          <g
            key={`${region.from}-${region.to}`}
            data-part="region"
            data-series={region.label}
          >
            <rect
              x={round(RX(region.from))}
              y={top - 4}
              width={round(Math.max(0, RX(region.to) - RX(region.from)))}
              height={round(bottom - top + 4)}
              fill={ink(0.07)}
            />
            {region.label && (
              <text
                x={round(RX(region.from)) + 5}
                y={round(top + T.label.px - 2)}
                {...T.label.attrs}
              >
                {region.label}
              </text>
            )}
          </g>
        ))}
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {signedSingle && (
          <defs>
            <clipPath id={`${clipId}-pos`}>
              <rect x={0} y={0} width={F.width} height={round(Y(0))} />
            </clipPath>
            <clipPath id={`${clipId}-neg`}>
              <rect
                x={0}
                y={round(Y(0))}
                width={F.width}
                height={round(Math.max(0, F.height - Y(0)))}
              />
            </clipPath>
          </defs>
        )}
        {signedSingle && yLo0 < 0 && (
          <line
            x1={left}
            y1={round(Y(0))}
            x2={right}
            y2={round(Y(0))}
            stroke={GRID}
            data-part="grid"
            {...stroke.hair}
          />
        )}
        {trend &&
          xScale !== "log" &&
          yScale !== "log" &&
          all.map((s, k) => {
            if (s.data.length === 0) return null;
            const samples = s.data.map((value, i) => ({
              x: xs?.[i] ?? i,
              y: value,
            }));
            const x0 = Math.min(...samples.map((p) => p.x));
            const x1 = Math.max(...samples.map((p) => p.x));
            const fit = linearFit(samples);
            return (
              <line
                key={k}
                x1={round(X(x0))}
                y1={round(Y(fit(x0)))}
                x2={round(X(x1))}
                y2={round(Y(fit(x1)))}
                stroke={multi ? cat(k) : ACCENT}
                strokeDasharray="3 4"
                opacity="0.7"
                data-part="trend"
                data-series={s.name}
                {...stroke.hair}
              />
            );
          })}
        {grids.map((pts, k) => {
          const lastIndex = pts.length - 1;
          const cut =
            forecastIndex === undefined
              ? undefined
              : Math.max(0, Math.min(lastIndex, forecastIndex));
          const paths =
            cut !== undefined && cut > 0 && cut < lastIndex
              ? [
                  {
                    d: lineRangePath(pts, 0, cut, Boolean(step)),
                    dashed: false,
                  },
                  {
                    d: lineRangePath(pts, cut, lastIndex, Boolean(step)),
                    dashed: true,
                  },
                ]
              : [
                  {
                    d: step ? stepPath(pts) : linePath(pts),
                    dashed: lastIndex > 0 && cut === 0,
                  },
                ];
          const strokes = signedSingle
            ? [
                { color: POS, clip: `url(#${clipId}-pos)` },
                { color: NEG, clip: `url(#${clipId}-neg)` },
              ]
            : [{ color: multi ? cat(k) : ink(0.75), clip: undefined }];
          return strokes.flatMap((line, j) =>
            paths.map((path, i) => (
              <path
                key={`${k}-${j}-${i}`}
                d={path.d}
                fill="none"
                stroke={line.color}
                clipPath={line.clip}
                strokeDasharray={path.dashed ? "4 4" : undefined}
                opacity={multi ? 0.85 : 1}
                strokeLinejoin="round"
                data-part="mark"
                data-series={all[k]!.name}
                {...stroke.line}
              />
            )),
          );
        })}
        {!multi && last && (
          <g>
            <Pulse
              cx={round(last.x)}
              cy={round(last.y)}
              r={3.5}
              color={endColor}
            />
            <circle
              cx={round(last.x)}
              cy={round(last.y)}
              r={3.5}
              fill={endColor}
              data-part="mark"
            />
            <text
              x={round(endX)}
              y={round(last.y - 8)}
              textAnchor="middle"
              {...T.value.attrs}
              fill={signedSingle ? endColor : T.value.attrs.fill}
            >
              {endLabel}
            </text>
          </g>
        )}
        {grids.map((pts, k) =>
          pts.map((p, i) => (
            <circle
              key={`hit-${k}-${i}`}
              cx={round(p.x)}
              cy={round(p.y)}
              r={hit}
              fill="transparent"
              data-dg-hit-target="point"
              data-part="mark"
              data-i={i}
              data-series={all[k]!.name || undefined}
            />
          )),
        )}
        {marks?.map((mark) => {
          const si = mark.series
            ? all.findIndex((s) => s.name === mark.series)
            : 0;
          const pts = si >= 0 ? grids[si] : undefined;
          const p = pts?.[Math.round(mark.at)];
          if (!p) return null;
          const color = multi && si >= 0 ? cat(si) : ACCENT;
          if (mark.kind === "censor") {
            return (
              <g
                key={`${mark.series ?? si}-${mark.at}-censor`}
                data-part="mark"
                data-series={mark.series}
              >
                <line
                  x1={round(p.x)}
                  y1={round(p.y - 5)}
                  x2={round(p.x)}
                  y2={round(p.y + 5)}
                  stroke={color}
                  {...stroke.medium}
                />
              </g>
            );
          }
          return (
            <g
              key={`${mark.series ?? si}-${mark.at}-${mark.label}`}
              data-part="mark"
              data-series={mark.series}
            >
              <circle cx={round(p.x)} cy={round(p.y)} r={3} fill={color} />
              {mark.label ? (
                <text
                  x={round(p.x)}
                  y={round(p.y - 7)}
                  textAnchor="middle"
                  {...T.value.attrs}
                  fill={multi && si >= 0 ? cat(si) : ink(0.75)}
                >
                  {mark.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {showLegend && multi && (
          <SvgLegend
            frame={F}
            names={all.map((s) => s.name)}
            colors={all.map((_, k) => cat(k))}
          />
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labelXs(
              first.map((p) => p.x),
              labels.length,
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Line.displayName = "Line";
