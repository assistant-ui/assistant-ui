import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { round } from "../../core/geometry";
import { ACCENT } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type FunnelProps = BaseProps & { items: Item[]; showRates?: boolean };

export const Funnel = forwardRef<SVGSVGElement, FunnelProps>(
  ({ items, showRates = true, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const first = items[0]?.value ?? 1;
    const rowH = (vh - 12) / Math.max(1, items.length);
    const full = 168;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {items.map((stage, i) => {
          const share = stage.value / first;
          const next = items[i + 1] ? items[i + 1]!.value / first : share * 0.8;
          const w0 = full * share;
          const w1 = full * next;
          const y = 6 + i * rowH;
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
                  y={y + rowH / 2 + 1.2}
                  textAnchor="middle"
                  {...TXT.onSeries}
                >
                  {stage.label}
                  {showRates ? ` · ${rate}%` : ""}
                </text>
              )}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Funnel.displayName = "Funnel";
