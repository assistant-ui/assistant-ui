import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { type TickSpec, resolveTicks, tickValues } from "../../core/scale";
import { hexPath, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, SURFACE, cat, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  PAD,
  TickGrid,
  frame,
  hitRadius,
  resolveWidth,
  typeScale,
} from "../svg";
import type { Guide, ScaleKind } from "../../core/types";
import { textWidth, truncate } from "../../core/text";
import { scatterDomain, scatterFrame } from "./scatter";

type ConnectedPoint = { x: number; y: number; label?: string };

export type ConnectedScatterProps = BaseProps & {
  points?: ConnectedPoint[];
  series?: { name: string; points: ConnectedPoint[] }[];
  xLabel?: string;
  yLabel?: string;
  xTicks?: TickSpec;
  yTicks?: TickSpec;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  guides?: readonly Guide[];
  reverseX?: boolean;
  refPoint?: {
    x: number;
    y: number;
    xLabel?: string;
    yLabel?: string;
    label?: string;
  };
};

/** Marker shapes repeat with the palette so series remain distinguishable in print and under CVD. */
function Marker({
  shape,
  x,
  y,
  fill,
  ...rest
}: {
  shape: number;
  x: number;
  y: number;
  fill: string;
} & Record<string, unknown>) {
  const r = 3;
  const common = { fill, stroke: SURFACE, strokeWidth: 1, ...rest };
  switch (shape % 6) {
    case 1:
      return (
        <path
          d={`M${round(x)} ${round(y - r * 1.2)} L${round(x + r * 1.2)} ${round(y)} L${round(x)} ${round(y + r * 1.2)} L${round(x - r * 1.2)} ${round(y)} Z`}
          {...common}
        />
      );
    case 2:
      return (
        <rect
          x={round(x - r * 0.9)}
          y={round(y - r * 0.9)}
          width={round(r * 1.8)}
          height={round(r * 1.8)}
          {...common}
        />
      );
    case 3:
      return (
        <path
          d={`M${round(x)} ${round(y - r * 1.15)} L${round(x + r)} ${round(y + r * 0.75)} L${round(x - r)} ${round(y + r * 0.75)} Z`}
          {...common}
        />
      );
    case 4:
      return <path d={hexPath(x, y, r * 1.08)} {...common} />;
    case 5:
      return (
        <path
          d={`M${round(x)} ${round(y + r * 1.15)} L${round(x + r)} ${round(y - r * 0.75)} L${round(x - r)} ${round(y - r * 0.75)} Z`}
          {...common}
        />
      );
    default:
      return <circle cx={round(x)} cy={round(y)} r={r} {...common} />;
  }
}

export const ConnectedScatter = forwardRef<
  SVGSVGElement,
  ConnectedScatterProps
>(
  (
    {
      points,
      series,
      xLabel,
      yLabel,
      xTicks,
      yTicks,
      xScale,
      yScale,
      guides,
      reverseX,
      refPoint,
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
    const all = series ?? [{ name: "", points: points ?? [] }];
    const multi = series !== undefined;
    const everyPoint = all.flatMap((s) => s.points);
    const domain = scatterDomain(everyPoint, {
      x: [
        ...tickValues(xTicks),
        ...(refPoint ? [refPoint.x] : []),
        ...(guides?.filter((g) => g.axis === "x").map((g) => g.at) ?? []),
      ],
      y: [
        ...tickValues(yTicks),
        ...(refPoint ? [refPoint.y] : []),
        ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
          []),
      ],
      ...(xScale ? { xScale } : {}),
      ...(yScale ? { yScale } : {}),
    });
    const yTickList = resolveTicks(
      yTicks,
      domain.yLo,
      domain.yHi,
      domain.yScale,
      format,
    );
    const xTickList = resolveTicks(
      xTicks,
      domain.xLo,
      domain.xHi,
      domain.xScale,
      format,
    );
    const nameW = Math.max(
      0,
      ...all.map((run) =>
        run.name ? textWidth(run.name, typeScale(fontSize).axis.px) : 0,
      ),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      ticks: yTickList ?? false,
      ...(nameW > 0 && !reverseX
        ? { right: resolveWidth(width) - PAD - Math.ceil(nameW) - 8 }
        : {}),
    });
    const { left, right, top, bottom, axisY, T } = F;
    const { X: XF, Y } = scatterFrame(F, domain);
    const X = reverseX ? (v: number) => left + right - XF(v) : XF;
    const xText = xLabel ? `${reverseX ? "← " : ""}${xLabel} →` : undefined;
    const yText = yLabel
      ? truncate(yLabel, T.axis.px, bottom - top)
      : undefined;
    const yLabelX = Math.max(8, T.axis.px / 2 + 8);
    const yLabelY = (top + bottom) / 2;
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
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1={left}
          y1={bottom}
          x2={left}
          y2={top}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
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
        {refPoint && (
          <g data-part="grid">
            <line
              x1={left}
              y1={round(Y(refPoint.y))}
              x2={round(X(refPoint.x))}
              y2={round(Y(refPoint.y))}
              stroke={ink(0.45)}
              strokeDasharray="3 4"
              {...stroke.hair}
            />
            <line
              x1={round(X(refPoint.x))}
              y1={round(Y(refPoint.y))}
              x2={round(X(refPoint.x))}
              y2={bottom}
              stroke={ink(0.45)}
              strokeDasharray="3 4"
              {...stroke.hair}
            />
            {refPoint.yLabel && (
              <text
                x={left - 6}
                y={round(Y(refPoint.y)) + 2}
                textAnchor="end"
                {...T.axis.attrs}
                fill={ink(0.8)}
              >
                {truncate(refPoint.yLabel, T.axis.px, left - 14)}
              </text>
            )}
            {refPoint.xLabel && (
              <text
                x={round(X(refPoint.x))}
                y={axisY}
                textAnchor="middle"
                {...T.axis.attrs}
                fill={ink(0.8)}
              >
                {truncate(
                  refPoint.xLabel,
                  T.axis.px,
                  2 * Math.min(X(refPoint.x), F.width - X(refPoint.x)),
                )}
              </text>
            )}
            {refPoint.label && (
              <text
                x={round(X(refPoint.x))}
                y={round(Y(refPoint.y)) - 8}
                textAnchor="middle"
                {...T.axis.attrs}
                fill={ink(0.8)}
              >
                {truncate(
                  refPoint.label,
                  T.axis.px,
                  2 * Math.min(X(refPoint.x), F.width - X(refPoint.x)),
                )}
              </text>
            )}
          </g>
        )}
        {all.map((run, k) => {
          const path = run.points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
          const first = path[0];
          const last = path[path.length - 1];
          const color = multi ? cat(k) : ink(0.6);
          const hit = Math.max(
            10,
            hitRadius(right - left, Math.max(1, run.points.length - 1)),
          );
          const labelSpace = last
            ? {
                before: Math.max(0, last.x - left - 4),
                after: Math.max(0, F.width - PAD - last.x - 4),
              }
            : undefined;
          const labelWidth = run.name ? textWidth(run.name, T.axis.px) : 0;
          const labelLeft =
            labelSpace &&
            (reverseX
              ? labelSpace.before >= labelWidth ||
                labelSpace.before >= labelSpace.after
              : labelSpace.after < labelWidth &&
                labelSpace.before > labelSpace.after);
          const labelFit = labelSpace
            ? labelLeft
              ? labelSpace.before
              : labelSpace.after
            : 0;
          const seriesLabel = truncate(run.name, T.axis.px, labelFit);
          return (
            <g key={run.name || k}>
              {path.length > 1 && (
                <path
                  d={path
                    .map(
                      (p, i) =>
                        `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={multi ? cat(k) : ink(0.45)}
                  opacity={multi ? 0.8 : 1}
                  data-part="mark"
                  data-series={run.name}
                  {...stroke.medium}
                />
              )}
              {path.map((p, i) =>
                multi ? (
                  <Marker
                    key={i}
                    shape={k}
                    x={p.x}
                    y={p.y}
                    fill={color}
                    data-part="mark"
                    data-series={run.name}
                    data-i={i}
                  />
                ) : (
                  <circle
                    key={i}
                    cx={round(p.x)}
                    cy={round(p.y)}
                    r={3}
                    fill={color}
                    data-part="mark"
                    data-series={run.name}
                    data-i={i}
                  />
                ),
              )}
              {!multi && first && (
                <circle
                  cx={round(first.x)}
                  cy={round(first.y)}
                  r={3}
                  fill={SURFACE}
                  stroke={ink(0.6)}
                  {...stroke.medium}
                />
              )}
              {!multi && last && (
                <circle
                  cx={round(last.x)}
                  cy={round(last.y)}
                  r={3.5}
                  fill={ACCENT}
                />
              )}
              {run.points.map((p, i) => (
                <circle
                  key={`hit-${i}`}
                  cx={round(X(p.x))}
                  cy={round(Y(p.y))}
                  r={hit}
                  fill="transparent"
                  data-part="mark"
                  data-series={run.name || undefined}
                  data-i={i}
                />
              ))}
              {run.points.map((p, i) =>
                p.label ? (
                  <text
                    key={`label-${i}`}
                    x={round(X(p.x))}
                    y={round(Y(p.y)) + (!multi && i === 0 ? 10 : -6)}
                    textAnchor="middle"
                    {...T.axis.attrs}
                  >
                    {truncate(
                      p.label,
                      T.axis.px,
                      2 * Math.min(X(p.x), F.width - X(p.x)),
                    )}
                  </text>
                ) : null,
              )}
              {multi && run.name && last && seriesLabel && (
                <text
                  x={round(last.x) + (labelLeft ? -4 : 4)}
                  y={round(last.y) - 3}
                  textAnchor={labelLeft ? "end" : "start"}
                  {...T.axis.attrs}
                >
                  {seriesLabel}
                </text>
              )}
            </g>
          );
        })}
        {yText && (
          <text
            x={round(yLabelX)}
            y={round(yLabelY)}
            transform={`rotate(-90 ${round(yLabelX)} ${round(yLabelY)})`}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {yText}
          </text>
        )}
        {xText && (
          <text
            x={round((left + right) / 2)}
            y={axisY}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {truncate(xText, T.axis.px, right - left)}
          </text>
        )}
      </ChartSvg>
    );
  },
);

ConnectedScatter.displayName = "ConnectedScatter";
