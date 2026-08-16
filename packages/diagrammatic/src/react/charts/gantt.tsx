import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, round, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  rowMarkH,
  rowMid,
  typeScale,
  vbHeight,
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
    { rows, today, labels, title, aspect, density, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const top = today === undefined ? 10 : 16;
    const bottom = labels ? vh - 16 : vh - 6;
    const left = density === "figure" ? 52 : 46;
    const [lo, hi] = extent([
      ...rows.flatMap((r) => [r.from, r.to]),
      ...(today === undefined ? [] : [today]),
    ]);
    const span = hi - lo || 1;
    const X = (v: number) => left + ((v - lo) / span) * (190 - left);
    const rowH = (bottom - top) / Math.max(1, rows.length);
    const barH = rowMarkH(rowH, 0.4);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {rows.map((row, i) => {
          const mid = rowMid(i, rowH, top);
          const state = row.state ?? "done";
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text x="8" y={mid} dominantBaseline="central" {...T.axis}>
                {row.label}
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
              y1={top - 6}
              x2={round(X(today))}
              y2={bottom}
              stroke={ACCENT}
              strokeDasharray="3 3"
              data-part="grid"
              {...stroke.hair}
            />
            <text
              x={round(X(today))}
              y={top - 8}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize={T.axis.fontSize}
              fill={ACCENT}
              fontFamily={T.axis.fontFamily}
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
                left + (i * (190 - left)) / Math.max(1, labels.length - 1),
            )}
            y={vh - (density === "figure" ? 6 : 4)}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Gantt.displayName = "Gantt";
