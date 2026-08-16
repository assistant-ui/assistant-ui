import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  labelXs,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type MirroredAreaProps = BaseProps & { down: Series; up: Series };

export const MirroredArea = forwardRef<SVGSVGElement, MirroredAreaProps>(
  ({ down, up, labels, title, aspect, density, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      labels: Boolean(labels),
      legend: true,
    });
    const mid = (top + bottom) / 2;
    const max = Math.max(...down.data, ...up.data, 1);
    const topPts = scalePoints(down.data, left, right, mid - 2, top, 0, max);
    const upPts = scalePoints(up.data, left, right, mid + 2, bottom, 0, max);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <ColumnHits
          count={down.data.length}
          x0={left}
          x1={right}
          top={top}
          bottom={bottom}
        />
        <path
          d={areaPath(topPts, mid - 2)}
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
          d={areaPath(upPts, mid + 2)}
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
        <text
          x={left}
          y={top - 3}
          fontSize={T.axis.fontSize}
          fill={ACCENT}
          fontFamily={T.axis.fontFamily}
        >
          ↓ {down.name}
        </text>
        <text x={left} y={bottom - 2} {...T.axis}>
          ↑ {up.name}
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
