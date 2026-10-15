import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import {
  extent,
  linear,
  round,
  rowMarkH,
  rowMid,
  stroke,
} from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  PAD,
  frame,
  resolveWidth,
  typeScale,
} from "../svg";

export type GanttProps = BaseProps & {
  rows: {
    label: string;
    from: number;
    to: number;
    state?: "done" | "active" | "planned";
  }[];
  today?: number;
};

export const Gantt = forwardRef<SVGSVGElement, GanttProps>(
  (
    {
      rows,
      today,
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
    const labelType = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelW = Math.max(
      0,
      ...rows.map((row) => textWidth(row.label, labelType.label.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(labels),
      legend: today !== undefined,
      left: Math.min(Math.round(W * 0.4), Math.ceil(PAD + labelW + 6)),
    });
    const { left, right, top, bottom, axisY, legendY, T } = F;
    const [lo, hi] = extent([
      ...rows.flatMap((r) => [r.from, r.to]),
      ...(today === undefined ? [] : [today]),
    ]);
    const X = linear(lo, hi, left, right);
    const rowH = (bottom - top) / Math.max(1, rows.length);
    const barH = rowMarkH(rowH, 0.4);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {rows.map((row, i) => {
          const mid = rowMid(i, rowH, top);
          const state = row.state ?? "done";
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 6}
                y={mid}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - 6 - PAD)}
              </text>
              {state === "planned" ? (
                <rect
                  x={round(X(row.from))}
                  y={round(mid - barH / 2)}
                  width={round(X(row.to) - X(row.from))}
                  height={round(barH)}
                  fill={ACCENT}
                  opacity="0.18"
                  stroke={ACCENT}
                  strokeOpacity="0.5"
                  {...stroke.hair}
                />
              ) : (
                <rect
                  x={round(X(row.from))}
                  y={round(mid - barH / 2)}
                  width={round(X(row.to) - X(row.from))}
                  height={round(barH)}
                  fill={state === "active" ? ACCENT : ink(0.25)}
                />
              )}
            </g>
          );
        })}
        {today !== undefined && (
          <g>
            <line
              x1={round(X(today))}
              y1={top}
              x2={round(X(today))}
              y2={bottom}
              stroke={ACCENT}
              strokeDasharray="3 4"
              data-part="grid"
              {...stroke.hair}
            />
            <text
              x={round(X(today))}
              y={legendY}
              textAnchor="middle"
              {...T.axis.attrs}
              fill={ACCENT}
            >
              today
            </text>
          </g>
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Gantt.displayName = "Gantt";
