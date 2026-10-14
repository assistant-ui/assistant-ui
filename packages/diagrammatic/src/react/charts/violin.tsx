import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { linePath, round, stroke } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ACCENT, cat, ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type ViolinProps = BaseProps & {
  groups: {
    label: string;
    widths: number[];
    median: number;
    points?: readonly number[];
  }[];
  categorical?: boolean;
};

function jitter(value: number, index: number): number {
  const h = Math.sin(value * 12.9898 + index * 78.233) * 43758.5453;
  return (h - Math.floor(h)) * 2 - 1;
}

export const Violin = forwardRef<SVGSVGElement, ViolinProps>(
  (
    {
      groups,
      categorical,
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const step = (right - left) / Math.max(1, groups.length);
    const maxWidth = Math.max(...groups.flatMap((g) => g.widths), 1);
    const halfMax = Math.min(24, step * 0.32);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {groups.map((shape, i) => {
          const cx = left + step * (i + 0.5);
          const widths = shape.widths.length ? shape.widths : [0];
          const rows = widths.length;
          const rowStep = (bottom - top) / Math.max(1, rows - 1);
          const spanBottom = top + (rows - 1) * rowStep;
          const rightPts = widths.map((w, k) => ({
            x: cx + (w / maxWidth) * halfMax,
            y: spanBottom - k * rowStep,
          }));
          const leftPts = widths
            .map((w, k) => ({
              x: cx - (w / maxWidth) * halfMax,
              y: spanBottom - k * rowStep,
            }))
            .reverse();
          const d = `${linePath(rightPts)} L${linePath(leftPts).slice(1)} Z`;
          const medianY = bottom - shape.median * (bottom - top);
          const fill = categorical ? cat(i) : ink(0.12);
          const pts = shape.points;
          const pMin = pts && pts.length ? Math.min(...pts) : 0;
          const pMax = pts && pts.length ? Math.max(...pts) : 1;
          const pSpan = pMax - pMin || 1;
          const widthAtT = (t: number) => {
            if (rows <= 1) return ((widths[0] ?? 0) / maxWidth) * halfMax;
            const pos = t * (rows - 1);
            const k0 = Math.max(0, Math.min(rows - 2, Math.floor(pos)));
            const f = pos - k0;
            const w = (widths[k0] ?? 0) * (1 - f) + (widths[k0 + 1] ?? 0) * f;
            return (w / maxWidth) * halfMax;
          };
          return (
            <g key={shape.label} data-part="mark" data-i={i}>
              <path
                d={d}
                fill={fill}
                fillOpacity={categorical ? 0.12 : undefined}
                stroke={ink(0.45)}
                {...stroke.hair}
              />
              {pts?.map((value, k) => {
                const t = (value - pMin) / pSpan;
                const half = widthAtT(t);
                return (
                  <circle
                    key={k}
                    cx={round(cx + jitter(value, k) * half * 0.7)}
                    cy={round(spanBottom - t * (spanBottom - top))}
                    r={3}
                    fill={categorical ? cat(i) : ink(0.5)}
                    opacity="0.55"
                  />
                );
              })}
              <circle cx={cx} cy={round(medianY)} r={3.5} fill={ACCENT} />
              <text x={cx} y={axisY} textAnchor="middle" {...T.axis.attrs}>
                {truncate(shape.label, T.axis.px, Math.max(0, step - 6))}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Violin.displayName = "Violin";
