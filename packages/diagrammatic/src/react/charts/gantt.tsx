import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, round, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

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
  ({ rows, today, labels, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = labels ? vh - 16 : vh - 6;
    const [lo, hi] = extent([
      ...rows.flatMap((r) => [r.from, r.to]),
      ...(today === undefined ? [] : [today]),
    ]);
    const span = hi - lo || 1;
    const X = (v: number) => 46 + ((v - lo) / span) * 144;
    const rowH = Math.min(15, (bottom - 12) / Math.max(1, rows.length));
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {rows.map((row, i) => {
          const y = 10 + i * rowH;
          const state = row.state ?? "done";
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text x="8" y={y + rowH / 2 + 1.6} {...TXT.axis}>
                {row.label}
              </text>
              {state === "planned" ? (
                <rect
                  x={round(X(row.from))}
                  y={y}
                  width={round(X(row.to) - X(row.from))}
                  height={rowH - 7}
                  rx={(rowH - 7) / 2}
                  fill={ACCENT}
                  opacity="0.18"
                  stroke={ACCENT}
                  strokeOpacity="0.5"
                  {...stroke.hair}
                />
              ) : (
                <rect
                  x={round(X(row.from))}
                  y={y}
                  width={round(X(row.to) - X(row.from))}
                  height={rowH - 7}
                  rx={(rowH - 7) / 2}
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
              y1="8"
              x2={round(X(today))}
              y2={bottom}
              stroke={ACCENT}
              strokeDasharray="3 3"
              data-part="grid"
              {...stroke.hair}
            />
            <text
              x={round(X(today))}
              y="6"
              textAnchor="middle"
              fontSize="4.5"
              fill={ACCENT}
              fontFamily={TXT.axis.fontFamily}
            >
              today
            </text>
          </g>
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) => 46 + (i * 144) / Math.max(1, labels.length - 1),
            )}
            y={vh - 4}
          />
        )}
      </ChartSvg>
    );
  },
);

Gantt.displayName = "Gantt";
