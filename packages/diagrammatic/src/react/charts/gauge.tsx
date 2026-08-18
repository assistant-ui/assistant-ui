import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { polar, round } from "../../core/geometry";
import { ACCENT, NEG, ink } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

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
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const T = typeScale(density);
    const vh =
      vbHeight(aspect, 5 / 3) + (ticks?.some((tick) => tick.label) ? 14 : 0);
    const cy = vh - 26;
    const r = Math.min(cy - 10, 78);
    const share = Math.max(0, Math.min(1, value));
    const inRed = (at: number) => redline !== undefined && at >= redline;
    const tickSize = Math.round(Math.max(6.6, r * 0.092) * 10) / 10;
    const plateSize = needle
      ? Math.round(Math.max(5.6, r * 0.072) * 10) / 10
      : Math.round(Math.max(7.2, r * 0.096) * 10) / 10;
    const valueSize = Math.round((needle ? r * 0.154 : r * 0.192) * 10) / 10;
    const endSize = Math.round(Math.max(4.8, r * 0.064) * 10) / 10;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <path
          d={semiArc(100, cy, r, 0, 1)}
          fill="none"
          strokeWidth={needle ? 3 : 9}
          strokeLinecap={needle ? "butt" : "round"}
          stroke={ink(0.08)}
          data-part="grid"
        />
        {redline !== undefined && (
          <path
            d={semiArc(100, cy, r + 7.5, redline, 1)}
            fill="none"
            stroke={NEG}
            strokeWidth="1.8"
            opacity="0.8"
            data-part="grid"
          />
        )}
        {minorTicks
          ? Array.from({ length: minorTicks + 1 }, (_, i) => {
              const at = i / minorTicks;
              const a = angleAt(at);
              const p0 = polar(100, cy, r + 4.5, a);
              const p1 = polar(100, cy, r + 6.5, a);
              return (
                <line
                  key={`m-${i}`}
                  x1={round(p0.x)}
                  y1={round(p0.y)}
                  x2={round(p1.x)}
                  y2={round(p1.y)}
                  stroke={inRed(at) ? NEG : ink(0.35)}
                  strokeWidth="0.35"
                  data-part="grid"
                />
              );
            })
          : null}
        {ticks?.map((tick) => {
          const a = angleAt(tick.at);
          const p0 = polar(100, cy, r + 3.5, a);
          const p1 = polar(100, cy, r + 7.5, a);
          const atEnd = tick.at <= 0.02 || tick.at >= 0.98;
          const pl = atEnd
            ? { x: tick.at < 0.5 ? 100 - r : 100 + r, y: cy + 11 }
            : polar(100, cy, r + 12, a);
          return (
            <g key={tick.at} data-part="grid">
              <line
                x1={round(p0.x)}
                y1={round(p0.y)}
                x2={round(p1.x)}
                y2={round(p1.y)}
                stroke={inRed(tick.at) ? NEG : ink(0.6)}
                strokeWidth="0.9"
              />
              {tick.label && (
                <text
                  x={round(pl.x)}
                  y={round(atEnd ? pl.y : pl.y + 1.4)}
                  textAnchor="middle"
                  {...T.axis}
                  fontSize={tickSize}
                  fill={inRed(tick.at) ? NEG : undefined}
                >
                  {tick.label}
                </text>
              )}
            </g>
          );
        })}
        <path
          d={semiArc(100, cy, r, 0, share)}
          fill="none"
          stroke={ACCENT}
          strokeWidth={needle ? 3 : 9}
          strokeLinecap={needle ? "butt" : "round"}
          data-part="mark"
        />
        {needle && (
          <g data-part="mark">
            {(() => {
              const a = angleAt(share);
              const tip = polar(100, cy, r - 3, a);
              const tail = polar(100, cy, -5, a);
              const side = a + Math.PI / 2;
              const b0 = polar(100, cy, 1.1, side);
              const b1 = polar(100, cy, -1.1, side);
              return (
                <path
                  d={`M${round(tip.x)} ${round(tip.y)} L${round(tail.x + (b0.x - 100))} ${round(tail.y + (b0.y - cy))} L${round(tail.x + (b1.x - 100))} ${round(tail.y + (b1.y - cy))} Z`}
                  fill={inRed(share) ? NEG : ACCENT}
                />
              );
            })()}
            <circle cx="100" cy={cy} r="3" fill={ink(0.85)} />
          </g>
        )}
        <text
          x="100"
          y={needle ? cy - 17 : cy - 9}
          textAnchor="middle"
          fontSize={valueSize}
          fill={ink(0.85)}
          fontFamily={T.value.fontFamily}
        >
          {display ?? `${Math.round(share * 100)}%`}
        </text>
        {label && (
          <text
            x="100"
            y={needle ? cy - 6 : cy + 4}
            textAnchor="middle"
            data-part="axis"
            {...T.label}
            fontSize={plateSize}
          >
            {label}
          </text>
        )}
        {min ? (
          <text
            x={100 - r}
            y={cy + 13}
            textAnchor="middle"
            data-part="axis"
            {...T.axis}
            fontSize={endSize}
          >
            {min}
          </text>
        ) : null}
        {max ? (
          <text
            x={100 + r}
            y={cy + 13}
            textAnchor="middle"
            data-part="axis"
            {...T.axis}
            fontSize={endSize}
          >
            {max}
          </text>
        ) : null}
      </ChartSvg>
    );
  },
);

Gauge.displayName = "Gauge";
