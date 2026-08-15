import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type AreaProps = BaseProps & { data: number[]; yMax?: number };

export const Area = forwardRef<SVGSVGElement, AreaProps>(
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
        <path d={areaPath(pts, bottom)} fill={ink(0.1)} data-part="mark" />
        <path
          d={linePath(pts)}
          fill="none"
          stroke={ink(0.7)}
          data-part="mark"
          {...stroke.line}
        />
        {last && (
          <text x={last.x} y={last.y - 5} textAnchor="middle" {...TXT.value}>
            {format(data[data.length - 1] ?? 0)}
          </text>
        )}
        {labels && (
          <AxisLabels labels={labels} xs={pts.map((p) => p.x)} y={vh - 4} />
        )}
      </ChartSvg>
    );
  },
);

Area.displayName = "Area";
