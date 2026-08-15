import type { BaseProps } from "../../core/types";
import { linePath, round } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type ViolinProps = BaseProps & {
  groups: { label: string; widths: number[]; median: number }[];
};

export function Violin({ groups, title, aspect, className }: ViolinProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = vh - 16;
  const step = 176 / Math.max(1, groups.length);
  const maxWidth = Math.max(...groups.flatMap((g) => g.widths), 1);
  const halfMax = Math.min(16, step * 0.32);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {groups.map((shape, i) => {
        const cx = 14 + step * (i + 0.5);
        const rows = shape.widths.length;
        const rowStep = (bottom - 12 - 2) / Math.max(1, rows - 1);
        const right = shape.widths.map((w, k) => ({
          x: cx + (w / maxWidth) * halfMax,
          y: 12 + k * rowStep,
        }));
        const left = shape.widths
          .map((w, k) => ({
            x: cx - (w / maxWidth) * halfMax,
            y: 12 + k * rowStep,
          }))
          .reverse();
        const d = `${linePath(right)} L${linePath(left).slice(1)} Z`;
        const medianY = bottom - shape.median * (bottom - 12);
        return (
          <g key={shape.label} data-part="mark" data-i={i}>
            <path
              d={d}
              fill={ink(0.12)}
              stroke={ink(0.45)}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={cx} cy={round(medianY)} r="2.6" fill={ACCENT} />
            <text x={cx} y={vh - 4} textAnchor="middle" {...TXT.axis}>
              {shape.label}
            </text>
          </g>
        );
      })}
    </ChartSvg>
  );
}
