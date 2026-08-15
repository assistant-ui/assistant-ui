import type { BaseProps } from "../../core/types";
import { linePath, scalePoints } from "../../core/geometry";
import { ACCENT, SURFACE, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type RidgelineProps = BaseProps & {
  rows: { label: string; bins: number[] }[];
  highlight?: string;
};

export function Ridgeline({
  rows,
  highlight,
  labels,
  title,
  aspect,
  className,
}: RidgelineProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = labels ? vh - 14 : vh - 6;
  const rowStep = (bottom - 34) / Math.max(1, rows.length - 1);
  const max = Math.max(...rows.flatMap((r) => r.bins), 1);
  const rise = Math.min(30, rowStep * 1.7);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {rows.map((row, i) => {
        const baseline = 34 + i * rowStep;
        const pts = scalePoints(
          row.bins,
          34,
          190,
          baseline,
          baseline - rise,
          0,
          max,
        );
        const accent = highlight !== undefined && row.label === highlight;
        return (
          <g
            key={row.label}
            data-part="mark"
            data-i={i}
            data-series={row.label}
          >
            <path
              d={`${linePath(pts)} L190 ${baseline} L34 ${baseline} Z`}
              fill={SURFACE}
              stroke={accent ? ACCENT : ink(0.4)}
              strokeWidth={accent ? 1.5 : 1}
              vectorEffect="non-scaling-stroke"
            />
            <text x="8" y={baseline + 1} {...TXT.axis}>
              {row.label}
            </text>
          </g>
        );
      })}
      {labels && (
        <AxisLabels
          labels={labels}
          xs={labels.map(
            (_, i) => 44 + (i * 138) / Math.max(1, labels.length - 1),
          )}
          y={vh - 3}
        />
      )}
    </ChartSvg>
  );
}
