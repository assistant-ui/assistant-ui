import type { BaseProps } from "../../core/types";
import { extent, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type BoxPlotProps = BaseProps & {
  groups: {
    label: string;
    low: number;
    q1: number;
    median: number;
    q3: number;
    high: number;
  }[];
};

export function BoxPlot({ groups, title, aspect, className }: BoxPlotProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = vh - 16;
  const [lo, hi] = extent(groups.flatMap((g) => [g.low, g.high]));
  const span = hi - lo || 1;
  const Y = (v: number) => bottom - ((v - lo) / span) * (bottom - 14);
  const step = 176 / Math.max(1, groups.length);
  const half = Math.min(14, step * 0.28);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {groups.map((box, i) => {
        const x = 14 + step * (i + 0.5);
        return (
          <g key={box.label} data-part="mark" data-i={i}>
            <g stroke={ink(0.55)} {...stroke.medium}>
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
              <rect
                x={x - half}
                y={Y(box.q3)}
                width={half * 2}
                height={Y(box.q1) - Y(box.q3)}
                rx="3"
                fill={ink(0.08)}
              />
              <line
                x1={x - half}
                y1={Y(box.median)}
                x2={x + half}
                y2={Y(box.median)}
                stroke={ACCENT}
                {...stroke.line}
              />
            </g>
            <text x={x} y={vh - 4} textAnchor="middle" {...TXT.axis}>
              {box.label}
            </text>
          </g>
        );
      })}
    </ChartSvg>
  );
}
