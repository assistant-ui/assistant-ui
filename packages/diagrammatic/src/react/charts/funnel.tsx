import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { round, rowMid } from "../../core/geometry";
import { ACCENT } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type FunnelProps = BaseProps & {
  items: Item[];
  showRates?: boolean;
  rates?: boolean;
};

export const Funnel = forwardRef<SVGSVGElement, FunnelProps>(
  (
    {
      items,
      showRates = true,
      rates,
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
    const { top, bottom } = plotFrame(vh, density);
    const first = items[0]?.value ?? 1;
    const rowH = (bottom - top) / Math.max(1, items.length);
    const full = 168;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {items.map((stage, i) => {
          const share = stage.value / first;
          const next = items[i + 1] ? items[i + 1]!.value / first : share * 0.8;
          const w0 = full * share;
          const w1 = full * next;
          const y = top + i * rowH;
          const mid = rowMid(i, rowH, top);
          const rate = Math.round(share * 100);
          return (
            <g key={stage.label} data-part="mark" data-i={i}>
              <path
                d={`M${round(100 - w0 / 2)} ${round(y)} H${round(100 + w0 / 2)} L${round(100 + w1 / 2)} ${round(y + rowH - 2)} H${round(100 - w1 / 2)} Z`}
                fill={ACCENT}
                opacity={Math.max(0.2, 0.92 - i * 0.17)}
              />
              {w0 > 40 && (
                <text
                  x="100"
                  y={mid}
                  textAnchor="middle"
                  dominantBaseline="central"
                  {...T.onSeries}
                >
                  {stage.label}
                  {showRates ? ` · ${rate}%` : ""}
                </text>
              )}
              {rates && items[i + 1] ? (
                <text
                  x={round(100 + w1 / 2 + 4)}
                  y={round(y + rowH - 1)}
                  {...T.axis}
                >
                  {Math.round((items[i + 1]!.value / stage.value) * 100) + "%"}
                </text>
              ) : null}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Funnel.displayName = "Funnel";
