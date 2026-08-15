import type { BaseProps } from "../../core/types";
import { extent, round, stroke } from "../../core/geometry";
import { GRID, cat } from "../../core/theme";
import { ChartSvg, Legend, TXT, vbHeight } from "../svg";

export type ParallelCoordinatesProps = BaseProps & {
  axes: string[];
  records: { name: string; values: number[] }[];
};

export function ParallelCoordinates({
  axes,
  records,
  legend,
  title,
  aspect,
  className,
}: ParallelCoordinatesProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const showLegend = legend ?? records.length > 1;
  const bottom = showLegend ? vh - 16 : vh - 8;
  const xs = axes.map((_, i) => 30 + (i * 156) / Math.max(1, axes.length - 1));
  const domains = axes.map((_, a) =>
    extent(records.map((r) => r.values[a] ?? 0)),
  );
  const Y = (value: number, a: number) => {
    const [lo, hi] = domains[a]!;
    return bottom - 2 - ((value - lo) / (hi - lo || 1)) * (bottom - 18);
  };
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {axes.map((axis, a) => (
        <g key={axis} data-part="axis">
          <line
            x1={xs[a]}
            y1="13"
            x2={xs[a]}
            y2={bottom}
            stroke={GRID}
            {...stroke.hair}
          />
          <text x={xs[a]} y="8" textAnchor="middle" {...TXT.axis}>
            {axis}
          </text>
        </g>
      ))}
      {records.map((record, k) => (
        <g key={record.name} data-part="mark" data-series={record.name}>
          <path
            d={record.values
              .map(
                (v, a) =>
                  `${a === 0 ? "M" : "L"}${round(xs[a]!)} ${round(Y(v, a))}`,
              )
              .join(" ")}
            fill="none"
            stroke={cat(k)}
            opacity="0.8"
            strokeLinejoin="round"
            {...stroke.line}
          />
          {record.values.map((v, a) => (
            <circle
              key={a}
              cx={round(xs[a]!)}
              cy={round(Y(v, a))}
              r="2.4"
              fill={cat(k)}
            />
          ))}
        </g>
      ))}
      {showLegend && (
        <Legend
          names={records.map((r) => r.name)}
          colors={records.map((_, k) => cat(k))}
          x={30}
          y={vh - 5}
        />
      )}
    </ChartSvg>
  );
}
