import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { extent, linear, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { swarmLanes } from "../../core/layout";
import { AxisLabels, ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type BeeswarmProps = BaseProps & {
  values: number[];
  flag?: { at: number; label: string };
};

export const Beeswarm = forwardRef<SVGSVGElement, BeeswarmProps>(
  (
    {
      values,
      flag,
      labels,
      format = formatCompact,
      title,
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const { left, right, axisY } = plotFrame(vh, density, {
      labels: true,
    });
    const mid = vh / 2 - (labels ? 4 : 0);
    const [lo, hi] = extent([...values, ...(flag ? [flag.at] : [])]);
    const X = linear(lo, hi, left, right);
    const xs = values.map(X);
    const lanes = swarmLanes(xs, 7.6);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <line
          x1={left}
          y1={mid}
          x2={right}
          y2={mid}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {values.map((v, i) => {
          const flagged = flag !== undefined && v === flag.at;
          return (
            <circle
              key={i}
              cx={xs[i]}
              cy={mid + lanes[i]! * 8.2}
              r="3.6"
              fill={flagged ? ACCENT : ink(0.45)}
              data-part="mark"
              data-i={i}
            />
          );
        })}
        {flag && (
          <text
            x={X(flag.at)}
            y={mid - 16}
            textAnchor="middle"
            fontSize={T.axis.fontSize}
            fill={ACCENT}
            fontFamily={T.axis.fontFamily}
          >
            {flag.label}
          </text>
        )}
        {labels ? (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        ) : (
          <g data-part="axis">
            <text x={left} y={axisY} textAnchor="middle" {...T.axis}>
              {format(lo)}
            </text>
            <text x={right} y={axisY} textAnchor="middle" {...T.axis}>
              {format(hi)}
            </text>
          </g>
        )}
      </ChartSvg>
    );
  },
);

Beeswarm.displayName = "Beeswarm";
