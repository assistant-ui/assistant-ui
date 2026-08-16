import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { GRID, NEG, POS, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type WaterfallProps = BaseProps & {
  steps: { label: string; value: number; total?: boolean }[];
};

export const Waterfall = forwardRef<SVGSVGElement, WaterfallProps>(
  (
    { steps, format = formatCompact, title, aspect, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = vh - 18;
    let running = 0;
    const resolved = steps.map((step) => {
      const from = step.total ? 0 : running;
      const to = step.total ? step.value : running + step.value;
      running = to;
      return { ...step, from, to };
    });
    const max = Math.max(...resolved.flatMap((s) => [s.from, s.to]), 1);
    const Y = (v: number) => bottom - (v / max) * (bottom - 18);
    const step = 184 / Math.max(1, steps.length);
    const width = Math.min(17, step * 0.6);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="8"
          y1={bottom}
          x2="192"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {resolved.map((entry, i) => {
          const x = 8 + step * (i + 0.5) - width / 2;
          const top = Y(Math.max(entry.from, entry.to));
          const h = Math.abs(Y(entry.from) - Y(entry.to));
          const next = resolved[i + 1];
          return (
            <g key={entry.label} data-part="mark" data-i={i}>
              <rect
                x={round(x)}
                y={round(top)}
                width={width}
                height={round(Math.max(h, 1.5))}
                fill={entry.total ? ink(0.55) : entry.value >= 0 ? POS : NEG}
                opacity={entry.total ? 1 : 0.85}
              />
              {!entry.total && (
                <text
                  x={round(x + width / 2)}
                  y={round(top - 3)}
                  textAnchor="middle"
                  {...TXT.axis}
                >
                  {entry.value > 0
                    ? `+${format(entry.value)}`
                    : format(entry.value)}
                </text>
              )}
              {next && !next.total && (
                <line
                  x1={round(x + width)}
                  y1={round(Y(entry.to))}
                  x2={round(x + step)}
                  y2={round(Y(entry.to))}
                  stroke={ink(0.3)}
                  {...stroke.hair}
                />
              )}
              <text
                x={round(x + width / 2)}
                y={vh - 6}
                textAnchor="middle"
                {...TXT.axis}
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
