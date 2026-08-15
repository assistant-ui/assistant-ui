import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { scalePoints, stepPath, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type StepLineProps = BaseProps & { data: number[]; yMax?: number };

export const StepLine = forwardRef<SVGSVGElement, StepLineProps>(
  (
    {
      data,
      yMax,
      labels,
      format = formatCompact,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = labels ? vh - 16 : vh - 8;
    const pts = scalePoints(
      data,
      14,
      186,
      bottom,
      14,
      0,
      yMax ?? Math.max(...data, 1),
    );
    const last = pts[pts.length - 1];
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="14"
          y1={bottom}
          x2="186"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <path
          d={stepPath(pts)}
          fill="none"
          stroke={ink(0.75)}
          strokeLinejoin="round"
          data-part="mark"
          {...stroke.line}
        />
        {last && (
          <g>
            <circle
              cx={last.x}
              cy={last.y}
              r="2.8"
              fill={ACCENT}
              data-part="mark"
            />
            <text x={last.x} y={last.y - 6} textAnchor="middle" {...TXT.value}>
              {format(data[data.length - 1] ?? 0)}
            </text>
          </g>
        )}
        {labels && (
          <AxisLabels labels={labels} xs={pts.map((p) => p.x)} y={vh - 4} />
        )}
      </ChartSvg>
    );
  },
);

StepLine.displayName = "StepLine";
