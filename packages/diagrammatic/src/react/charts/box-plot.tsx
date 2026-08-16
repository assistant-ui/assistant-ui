import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, round, stroke } from "../../core/geometry";
import { ACCENT, cat, ink } from "../../core/theme";
import { ChartSvg, TickGrid, TXT, vbHeight } from "../svg";

export type BoxPlotProps = BaseProps & {
  groups: {
    label: string;
    low: number;
    q1: number;
    median: number;
    q3: number;
    high: number;
    points?: readonly number[];
  }[];
  categorical?: boolean;
  yTicks?: readonly { at: number; label: string }[];
};

function jitter(value: number, index: number): number {
  const h = Math.sin(value * 12.9898 + index * 78.233) * 43758.5453;
  return (h - Math.floor(h)) * 2 - 1;
}

export const BoxPlot = forwardRef<SVGSVGElement, BoxPlotProps>(
  ({ groups, categorical, yTicks, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = vh - 16;
    const [lo, hi] = extent([
      ...groups.flatMap((g) => [g.low, g.high, ...(g.points ?? [])]),
      ...(yTicks?.map((t) => t.at) ?? []),
    ]);
    const span = hi - lo || 1;
    const Y = (v: number) => bottom - ((v - lo) / span) * (bottom - 14);
    const step = 176 / Math.max(1, groups.length);
    const half = Math.min(14, step * 0.28);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <TickGrid ticks={yTicks} at={Y} from={14} to={190} />
        {groups.map((box, i) => {
          const x = 14 + step * (i + 0.5);
          const color = categorical ? cat(i) : undefined;
          const frame = color ?? ink(0.55);
          return (
            <g key={box.label} data-part="mark" data-i={i}>
              <g stroke={frame} opacity={color ? 0.75 : 1} {...stroke.medium}>
                <line x1={x} y1={Y(box.high)} x2={x} y2={Y(box.q3)} />
                <line x1={x} y1={Y(box.q1)} x2={x} y2={Y(box.low)} />
                <line
                  x1={x - half * 0.6}
                  y1={Y(box.high)}
                  x2={x + half * 0.6}
                  y2={Y(box.high)}
                />
                <line
                  x1={x - half * 0.6}
                  y1={Y(box.low)}
                  x2={x + half * 0.6}
                  y2={Y(box.low)}
                />
              </g>
              <rect
                x={x - half}
                y={Y(box.q3)}
                width={half * 2}
                height={Y(box.q1) - Y(box.q3)}
                fill={color ?? ink(0.08)}
                opacity={color ? 0.3 : 1}
              />
              {box.points?.map((v, k) => (
                <circle
                  key={k}
                  cx={round(x + jitter(v, k) * half * 0.85)}
                  cy={round(Y(v))}
                  r="0.8"
                  fill={color ?? ink(0.5)}
                  opacity="0.55"
                />
              ))}
              <line
                x1={x - half}
                y1={Y(box.median)}
                x2={x + half}
                y2={Y(box.median)}
                stroke={color ? ink(0.85) : ACCENT}
                {...stroke.line}
              />
              <text
                x={x}
                y={vh - 4}
                textAnchor="middle"
                {...TXT.axis}
                fontSize={Math.min(4.5, Math.max(3.2, step * 0.09))}
              >
                {box.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

BoxPlot.displayName = "BoxPlot";
