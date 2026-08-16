import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { linePath, stroke } from "../../core/geometry";
import { cat } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type BumpProps = BaseProps & {
  series: { name: string; ranks: number[] }[];
};

export const Bump = forwardRef<SVGSVGElement, BumpProps>(
  ({ series, labels, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const stageCount = series[0]?.ranks.length ?? 0;
    const xs = Array.from(
      { length: stageCount },
      (_, i) => 22 + (i * 140) / Math.max(1, stageCount - 1),
    );
    const bottom = labels ? vh - 18 : vh - 10;
    const maxRank = Math.max(...series.flatMap((s) => s.ranks), 1);
    const Y = (rank: number) =>
      10 + ((rank - 1) / Math.max(1, maxRank - 1)) * (bottom - 18);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {series.map((s, k) => {
          const pts = s.ranks.map((rank, i) => ({ x: xs[i]!, y: Y(rank) }));
          const last = pts[pts.length - 1]!;
          return (
            <g key={s.name}>
              <path
                d={linePath(pts)}
                fill="none"
                stroke={cat(k)}
                opacity="0.85"
                data-part="mark"
                data-series={s.name}
                {...stroke.line}
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="2.4"
                  fill={cat(k)}
                  data-part="mark"
                  data-series={s.name}
                  data-i={i}
                />
              ))}
              {pts.map((p, i) => (
                <circle
                  key={`hit-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="transparent"
                  data-part="mark"
                  data-series={s.name}
                  data-i={i}
                />
              ))}
              <text
                x={last.x + 6}
                y={last.y + 1.6}
                fontSize="4.5"
                fill={cat(k)}
                fontFamily={TXT.axis.fontFamily}
              >
                {s.name}
              </text>
            </g>
          );
        })}
        {labels && <AxisLabels labels={labels} xs={xs} y={vh - 4} />}
      </ChartSvg>
    );
  },
);

Bump.displayName = "Bump";
