import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, linear, round, rowMid, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, Legend, plotFrame, typeScale, vbHeight } from "../svg";

export type DumbbellProps = BaseProps & {
  items: { label: string; from: number; to: number }[];
  fromLabel?: string;
  toLabel?: string;
};

export const Dumbbell = forwardRef<SVGSVGElement, DumbbellProps>(
  (
    {
      items,
      fromLabel = "before",
      toLabel = "after",
      legend,
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
    const showLegend = legend ?? true;
    const { left, right, top, bottom } = plotFrame(vh, density, {
      legend: showLegend,
      left: density === "figure" ? 50 : 44,
    });
    const [lo, hi] = extent(items.flatMap((r) => [r.from, r.to]));
    const X = linear(lo, hi, left, right);
    const rowH = (bottom - top) / Math.max(1, items.length);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {showLegend && (
          <Legend
            names={[fromLabel, toLabel]}
            colors={[ink(0.45), ACCENT]}
            x={192}
            y={10}
            anchor="end"
            type={T.axis}
          />
        )}
        {items.map((row, i) => {
          const y = rowMid(i, rowH, top);
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 4}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                {...T.axis}
              >
                {row.label}
              </text>
              <line
                x1={round(X(row.from))}
                y1={y}
                x2={round(X(row.to))}
                y2={y}
                stroke={ink(0.25)}
                {...stroke.line}
              />
              <circle cx={round(X(row.from))} cy={y} r="4" fill={ink(0.45)} />
              <circle cx={round(X(row.to))} cy={y} r="4" fill={ACCENT} />
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Dumbbell.displayName = "Dumbbell";
