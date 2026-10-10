import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { polar, round } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ACCENT, NEG, ink } from "../../core/theme";
import {
  ChartSvg,
  PAD,
  frame,
  resolveWidth,
  typeScale,
  typeSize,
} from "../svg";

export type GaugeProps = BaseProps & {
  value: number;
  display?: string;
  label?: string;
  min?: string;
  max?: string;
  ticks?: readonly { at: number; label?: string }[];
  minorTicks?: number;
  redline?: number;
  needle?: boolean;
};

function angleAt(share: number): number {
  return -Math.PI + Math.max(0, Math.min(1, share)) * Math.PI;
}

function semiArc(
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
): string {
  const a0 = angleAt(from);
  const a1 = angleAt(Math.max(from + 0.001, to));
  const start = polar(cx, cy, r, a0);
  const end = polar(cx, cy, r, a1);
  return `M${round(start.x)} ${round(start.y)} A${r} ${r} 0 0 1 ${round(end.x)} ${round(end.y)}`;
}

/** A single bounded value, 0 to 1, on a half dial. */
export const Gauge = forwardRef<SVGSVGElement, GaugeProps>(
  (
    {
      value,
      display,
      label,
      min = "0",
      max = "100",
      ticks,
      minorTicks,
      redline,
      needle,
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
    const T0 = typeScale(fontSize);
    const tickLabels = ticks?.some((tick) => tick.label) ?? false;
    const derivedHeight =
      Math.round((resolveWidth(width) / (aspect ?? 5 / 3)) * 100) / 100;
    const F = frame(
      {
        width,
        height:
          height ?? derivedHeight + (tickLabels ? T0.axis.px * 2 + 14 : 0),
        aspect,
        fontSize,
      },
      5 / 3,
    );
    const { left, right, top, bottom, T } = F;
    const cx = (left + right) / 2;
    const endAllowance = Math.max(T.axis.px * 2 + 4, 24);
    const endCaptionSpace = Math.max(T.axis.px * 2 + 8, (right - left) * 0.08);
    const cy = bottom - endCaptionSpace;
    const r = Math.min(
      (right - left) / 2 - endAllowance,
      (cy - top) / (tickLabels ? 1.25 : 1.06),
    );
    const share = Math.max(0, Math.min(1, value));
    const inRed = (at: number) => redline !== undefined && at >= redline;
    const tickSize = typeSize(T, Math.max(0.9, Math.min(r / 120, 1.6)));
    const plateSize = typeSize(
      T,
      Math.max(1, Math.min(r / (needle ? 153 : 115), 1.5)),
    );
    const valueSize = typeSize(
      T,
      Math.max(1.4, Math.min(r / (needle ? 71 : 57), 3.2)),
    );
    const endSize = typeSize(T, Math.max(0.9, Math.min(r / 172, 1.2)));
    const arcWidth = r * (needle ? 0.04 : 0.12);
    const redlineOffset = r * 0.096;
    const endY = cy + r * 0.166;
    const endFit = Math.max(0, 2 * (cx - r - PAD));
    const labelFit = Math.max(0, Math.min(r * 1.6, 2 * (cx - PAD)));
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <path
          d={semiArc(cx, cy, r, 0, 1)}
          fill="none"
          strokeWidth={arcWidth}
          strokeLinecap={needle ? "butt" : "round"}
          stroke={ink(0.08)}
          data-part="grid"
        />
        {redline !== undefined && (
          <path
            d={semiArc(cx, cy, r + redlineOffset, redline, 1)}
            fill="none"
            stroke={NEG}
            strokeWidth={r * 0.024}
            opacity="0.8"
            data-part="grid"
          />
        )}
        {minorTicks
          ? Array.from({ length: minorTicks + 1 }, (_, i) => {
              const at = i / minorTicks;
              const a = angleAt(at);
              const p0 = polar(cx, cy, r * 1.056, a);
              const p1 = polar(cx, cy, r * 1.083, a);
              return (
                <line
                  key={`m-${i}`}
                  x1={round(p0.x)}
                  y1={round(p0.y)}
                  x2={round(p1.x)}
                  y2={round(p1.y)}
                  stroke={inRed(at) ? NEG : ink(0.35)}
                  strokeWidth={r * 0.0045}
                  data-part="grid"
                />
              );
            })
          : null}
        {ticks?.map((tick) => {
          const a = angleAt(tick.at);
          const p0 = polar(cx, cy, r * 1.045, a);
          const p1 = polar(cx, cy, r * 1.096, a);
          const atEnd = tick.at <= 0.02 || tick.at >= 0.98;
          const pl = atEnd
            ? {
                x: tick.at < 0.5 ? cx - r : cx + r,
                y: cy + r * 0.14,
              }
            : polar(cx, cy, r * 1.154, a);
          const tickFit = Math.max(
            0,
            2 * Math.min(pl.x - PAD, F.width - PAD - pl.x),
          );
          const tickLabel = tick.label
            ? truncate(tick.label, tickSize.px, tickFit)
            : undefined;
          return (
            <g key={tick.at} data-part="grid">
              <line
                x1={round(p0.x)}
                y1={round(p0.y)}
                x2={round(p1.x)}
                y2={round(p1.y)}
                stroke={inRed(tick.at) ? NEG : ink(0.6)}
                strokeWidth={r * 0.012}
              />
              {tickLabel && (
                <text
                  x={round(pl.x)}
                  y={round(atEnd ? pl.y : pl.y + r * 0.018)}
                  textAnchor="middle"
                  {...T.axis.attrs}
                  fontSize={tickSize.fontSize}
                  fill={inRed(tick.at) ? NEG : T.axis.attrs.fill}
                >
                  {tickLabel}
                </text>
              )}
            </g>
          );
        })}
        <path
          d={semiArc(cx, cy, r, 0, share)}
          fill="none"
          stroke={ACCENT}
          strokeWidth={arcWidth}
          strokeLinecap={needle ? "butt" : "round"}
          data-part="mark"
        />
        {needle && (
          <g data-part="mark">
            {(() => {
              const a = angleAt(share);
              const tip = polar(cx, cy, r * 0.962, a);
              const tail = polar(cx, cy, -r * 0.064, a);
              const side = a + Math.PI / 2;
              const b0 = polar(cx, cy, r * 0.014, side);
              const b1 = polar(cx, cy, -r * 0.014, side);
              return (
                <path
                  d={`M${round(tip.x)} ${round(tip.y)} L${round(tail.x + (b0.x - cx))} ${round(tail.y + (b0.y - cy))} L${round(tail.x + (b1.x - cx))} ${round(tail.y + (b1.y - cy))} Z`}
                  fill={inRed(share) ? NEG : ACCENT}
                />
              );
            })()}
            <circle cx={cx} cy={cy} r={r * 0.038} fill={ink(0.85)} />
          </g>
        )}
        <text
          x={cx}
          y={cy - r * (needle ? 0.218 : 0.115)}
          textAnchor="middle"
          {...T.value.attrs}
          fontSize={valueSize.fontSize}
          fill={ink(0.85)}
        >
          {display ?? `${Math.round(share * 100)}%`}
        </text>
        {label && (
          <text
            x={cx}
            y={cy + r * (needle ? -0.077 : 0.051)}
            textAnchor="middle"
            data-part="axis"
            {...T.label.attrs}
            fontSize={plateSize.fontSize}
          >
            {truncate(label, plateSize.px, labelFit)}
          </text>
        )}
        {min ? (
          <text
            x={cx - r}
            y={endY}
            textAnchor="middle"
            data-part="axis"
            {...T.axis.attrs}
            fontSize={endSize.fontSize}
          >
            {truncate(min, endSize.px, endFit)}
          </text>
        ) : null}
        {max ? (
          <text
            x={cx + r}
            y={endY}
            textAnchor="middle"
            data-part="axis"
            {...T.axis.attrs}
            fontSize={endSize.fontSize}
          >
            {truncate(max, endSize.px, endFit)}
          </text>
        ) : null}
      </ChartSvg>
    );
  },
);

Gauge.displayName = "Gauge";
