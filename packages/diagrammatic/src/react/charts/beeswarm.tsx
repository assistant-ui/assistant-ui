import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { extent, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { swarmLanes } from "../../core/layout";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

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
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const mid = vh / 2 - (labels ? 4 : 0);
    const [lo, hi] = extent([...values, ...(flag ? [flag.at] : [])]);
    const span = hi - lo || 1;
    const X = (v: number) => 16 + ((v - lo) / span) * 168;
    const xs = values.map(X);
    const lanes = swarmLanes(xs, 7.6);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="12"
          y1={mid}
          x2="188"
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
            fontSize="4.5"
            fill={ACCENT}
            fontFamily={TXT.axis.fontFamily}
          >
            {flag.label}
          </text>
        )}
        {labels ? (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) => 16 + (i * 168) / Math.max(1, labels.length - 1),
            )}
            y={vh - 6}
          />
        ) : (
          <g data-part="axis">
            <text x="16" y={vh - 6} textAnchor="middle" {...TXT.axis}>
              {format(lo)}
            </text>
            <text x="184" y={vh - 6} textAnchor="middle" {...TXT.axis}>
              {format(hi)}
            </text>
          </g>
        )}
      </ChartSvg>
    );
  },
);

Beeswarm.displayName = "Beeswarm";
