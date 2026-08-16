import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { linePath, round } from "../../core/geometry";
import { ACCENT, cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

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
  ({ groups, categorical, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = vh - 16;
    const step = 176 / Math.max(1, groups.length);
    const maxWidth = Math.max(...groups.flatMap((g) => g.widths), 1);
    const halfMax = Math.min(16, step * 0.32);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {groups.map((shape, i) => {
          const cx = 14 + step * (i + 0.5);
          const rows = shape.widths.length;
          const rowStep = (bottom - 12 - 2) / Math.max(1, rows - 1);
          const top = 12;
          const spanBottom = 12 + (rows - 1) * rowStep;
          const right = shape.widths.map((w, k) => ({
            x: cx + (w / maxWidth) * halfMax,
            y: spanBottom - k * rowStep,
          }));
          const left = shape.widths
            .map((w, k) => ({
              x: cx - (w / maxWidth) * halfMax,
              y: spanBottom - k * rowStep,
            }))
            .reverse();
          const d = `${linePath(right)} L${linePath(left).slice(1)} Z`;
          const medianY = bottom - shape.median * (bottom - 12);
          const fill = categorical ? cat(i) : ink(0.12);
          const pts = shape.points;
          const pMin = pts && pts.length ? Math.min(...pts) : 0;
          const pMax = pts && pts.length ? Math.max(...pts) : 1;
          const pSpan = pMax - pMin || 1;
          const widthAtT = (t: number) => {
            if (rows <= 1) return ((shape.widths[0] ?? 0) / maxWidth) * halfMax;
            const pos = t * (rows - 1);
            const k0 = Math.max(0, Math.min(rows - 2, Math.floor(pos)));
            const f = pos - k0;
            const w =
              (shape.widths[k0] ?? 0) * (1 - f) +
              (shape.widths[k0 + 1] ?? 0) * f;
            return (w / maxWidth) * halfMax;
          };
          return (
            <g key={shape.label} data-part="mark" data-i={i}>
              <path
                d={d}
                fill={fill}
                fillOpacity={categorical ? 0.12 : undefined}
                stroke={ink(0.45)}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {pts?.map((value, k) => {
                const t = (value - pMin) / pSpan;
                const half = widthAtT(t);
                return (
                  <circle
                    key={k}
                    cx={round(cx + jitter(value, k) * half * 0.7)}
                    cy={round(spanBottom - t * (spanBottom - top))}
                    r="0.8"
                    fill={categorical ? cat(i) : ink(0.5)}
                    opacity="0.55"
                  />
                );
              })}
              <circle cx={cx} cy={round(medianY)} r="2.6" fill={ACCENT} />
              <text x={cx} y={vh - 4} textAnchor="middle" {...TXT.axis}>
                {shape.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Violin.displayName = "Violin";
