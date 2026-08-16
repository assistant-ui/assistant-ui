import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import {
  areaPath,
  linePath,
  round,
  scalePoints,
  stroke,
} from "../../core/geometry";
import { GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, labelXs, vbHeight } from "../svg";

export type AreaProps = BaseProps & {
  data: number[];
  yMax?: number;
  regions?: { from: number; to: number; label?: string }[];
};

export const Area = forwardRef<SVGSVGElement, AreaProps>(
  (
    {
      data,
      yMax,
      regions,
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
    const count = Math.max(1, data.length - 1);
    const RX = (i: number) =>
      14 + (Math.max(0, Math.min(count, i)) / count) * 172;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {regions?.map((region) => (
          <g
            key={`${region.from}-${region.to}`}
            data-part="region"
            data-series={region.label}
          >
            <rect
              x={round(RX(region.from))}
              y={12}
              width={round(Math.max(0, RX(region.to) - RX(region.from)))}
              height={bottom - 12}
              fill={ink(0.06)}
            />
            {region.label && (
              <text x={round(RX(region.from)) + 2.5} y={17} {...TXT.axis}>
                {region.label}
              </text>
            )}
          </g>
        ))}
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
        {pts.map((p, i) => (
          <circle
            key={`hit-${i}`}
            cx={round(p.x)}
            cy={round(p.y)}
            r={Math.min(4, 86 / Math.max(1, pts.length - 1))}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labelXs(
              pts.map((p) => p.x),
              labels.length,
            )}
            y={vh - 4}
          />
        )}
      </ChartSvg>
    );
  },
);

Area.displayName = "Area";
