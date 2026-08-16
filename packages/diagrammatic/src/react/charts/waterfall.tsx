import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { GRID, NEG, POS, ink } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type WaterfallProps = BaseProps & {
  steps: { label: string; value: number; total?: boolean }[];
};

export const Waterfall = forwardRef<SVGSVGElement, WaterfallProps>(
  (
    {
      steps,
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
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      labels: true,
    });
    let running = 0;
    const resolved = steps.map((step) => {
      const from = step.total ? 0 : running;
      const to = step.total ? step.value : running + step.value;
      running = to;
      return { ...step, from, to };
    });
    const max = Math.max(...resolved.flatMap((s) => [s.from, s.to]), 1);
    const Y = linear(0, max, bottom, top);
    const step = (right - left) / Math.max(1, steps.length);
    const width = Math.min(17, step * 0.6);
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
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {resolved.map((entry, i) => {
          const x = left + step * (i + 0.5) - width / 2;
          const barTop = Y(Math.max(entry.from, entry.to));
          const h = Math.abs(Y(entry.from) - Y(entry.to));
          const next = resolved[i + 1];
          return (
            <g key={entry.label} data-part="mark" data-i={i}>
              <rect
                x={round(x)}
                y={round(barTop)}
                width={width}
                height={round(Math.max(h, 1.5))}
                fill={entry.total ? ink(0.55) : entry.value >= 0 ? POS : NEG}
                opacity={entry.total ? 1 : 0.85}
              />
              {!entry.total && (
                <text
                  x={round(x + width / 2)}
                  y={round(barTop - 3)}
                  textAnchor="middle"
                  {...T.axis}
                >
                  {entry.value > 0
                    ? `+${format(entry.value)}`
                    : format(entry.value)}
                </text>
              )}
              {next && (
                <line
                  x1={round(x + width)}
                  y1={round(Y(entry.to))}
                  x2={round(x + step)}
                  y2={round(Y(entry.to))}
                  stroke={ink(0.3)}
                  {...stroke.hair}
                  strokeDasharray="1.5 2"
                  data-part="grid"
                />
              )}
              <text
                x={round(x + width / 2)}
                y={axisY}
                textAnchor="middle"
                {...T.axis}
              >
                {entry.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Waterfall.displayName = "Waterfall";
