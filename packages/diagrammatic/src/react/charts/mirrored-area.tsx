import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, Series } from "../../core/types";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ACCENT, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  Guides,
  frame,
  labelXs,
} from "../svg";

export type MirroredAreaProps = BaseProps & {
  down: Series;
  up: Series;
  guides?: readonly Guide[];
};

export const MirroredArea = forwardRef<SVGSVGElement, MirroredAreaProps>(
  (
    {
      down,
      up,
      guides,
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(labels),
      legend: true,
    });
    const { left, right, top, bottom, axisY, legendY, T } = F;
    const mid = (top + bottom) / 2;
    const splitGap = 6;
    const upperBase = mid - splitGap / 2;
    const lowerBase = mid + splitGap / 2;
    const max = Math.max(
      ...down.data,
      ...up.data,
      ...(guides?.map((g) => g.at) ?? []),
      1,
    );
    const Ydown = (v: number) => upperBase - (v / max) * (upperBase - top);
    const X = (i: number) => {
      const n = down.data.length;
      return left + (n > 1 ? (i / (n - 1)) * (right - left) : 0);
    };
    const topPts = scalePoints(down.data, left, right, upperBase, top, 0, max);
    const upPts = scalePoints(up.data, left, right, lowerBase, bottom, 0, max);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <Guides
          guides={guides}
          X={X}
          Y={Ydown}
          left={left}
          right={right}
          top={top}
          bottom={mid}
          type={T.axis}
        />
        <ColumnHits
          count={down.data.length}
          x0={left}
          x1={right}
          top={top}
          bottom={bottom}
        />
        <path
          d={areaPath(topPts, upperBase)}
          fill={ACCENT}
          opacity="0.22"
          data-part="mark"
          data-series={down.name}
        />
        <path
          d={linePath(topPts)}
          fill="none"
          stroke={ACCENT}
          {...stroke.line}
        />
        <path
          d={areaPath(upPts, lowerBase)}
          fill={ink(0.12)}
          data-part="mark"
          data-series={up.name}
        />
        <path
          d={linePath(upPts)}
          fill="none"
          stroke={ink(0.5)}
          {...stroke.medium}
        />
        <line
          x1={left}
          y1={mid}
          x2={right}
          y2={mid}
          stroke={ink(0.2)}
          data-part="grid"
          {...stroke.hair}
        />
        <text x={left} y={legendY} {...T.axis.attrs} fill={ACCENT}>
          ↓ {truncate(down.name, T.axis.px, right - left - T.axis.px * 2)}
        </text>
        <text x={left} y={bottom - 4} {...T.axis.attrs}>
          ↑ {truncate(up.name, T.axis.px, right - left - T.axis.px * 2)}
        </text>
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labelXs(
              topPts.map((p) => p.x),
              labels.length,
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

MirroredArea.displayName = "MirroredArea";
