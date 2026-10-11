import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { linePath, linear, round, stroke } from "../../core/geometry";
import { textWidth } from "../../core/text";
import { cat } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  PAD,
  frame,
  hitRadius,
  resolveWidth,
  typeScale,
} from "../svg";

export type BumpProps = BaseProps & {
  series: { name: string; ranks: number[] }[];
};

export const Bump = forwardRef<SVGSVGElement, BumpProps>(
  (
    {
      series,
      labels,
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
    const T = typeScale(fontSize);
    const W = resolveWidth(width);
    const nameW = Math.max(
      0,
      ...series.map((s) => textWidth(s.name, T.axis.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(labels),
      right: Math.max(PAD + 10, W - PAD - Math.ceil(nameW) - 6),
    });
    const { left, right, top, bottom, axisY } = F;
    const stageCount = series[0]?.ranks.length ?? 0;
    const xs = Array.from(
      { length: stageCount },
      (_, i) => left + (i * (right - left)) / Math.max(1, stageCount - 1),
    );
    const maxRank = Math.max(...series.flatMap((s) => s.ranks), 1);
    const Y = linear(1, Math.max(maxRank, 1), top, bottom);
    const hit = hitRadius(right - left, Math.max(1, stageCount - 1));
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {series.map((s, k) => {
          const pts = s.ranks.map((rank, i) => ({ x: xs[i]!, y: Y(rank) }));
          const last = pts[pts.length - 1];
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
                  cx={round(p.x)}
                  cy={round(p.y)}
                  r={3}
                  fill={cat(k)}
                  data-part="mark"
                  data-series={s.name}
                  data-i={i}
                />
              ))}
              {pts.map((p, i) => (
                <circle
                  key={`hit-${i}`}
                  cx={round(p.x)}
                  cy={round(p.y)}
                  r={hit}
                  fill="transparent"
                  data-part="mark"
                  data-series={s.name}
                  data-i={i}
                />
              ))}
              {last ? (
                <text
                  x={round(last.x + 6)}
                  y={round(last.y)}
                  dominantBaseline="central"
                  {...F.T.axis.attrs}
                  fill={cat(k)}
                >
                  {s.name}
                </text>
              ) : null}
            </g>
          );
        })}
        {labels && (
          <AxisLabels labels={labels} xs={xs} y={axisY} type={F.T.axis} />
        )}
      </ChartSvg>
    );
  },
);

Bump.displayName = "Bump";
