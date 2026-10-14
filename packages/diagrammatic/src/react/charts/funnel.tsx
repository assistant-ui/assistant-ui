import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import type { Item } from "../../core/types";
import { round, rowMid } from "../../core/geometry";
import { ACCENT, alpha } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type FunnelProps = BaseProps & {
  items: Item[];
  showRates?: boolean;
  rates?: boolean;
};

const STAGE_GAP = 2;
const RATE_GAP = 6;
const LABEL_PAD = 6;

export const Funnel = forwardRef<SVGSVGElement, FunnelProps>(
  (
    {
      items,
      showRates = true,
      rates,
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
    const labelRate = (from: number, to: number) =>
      `${Math.round((to / (from || 1)) * 100)}%`;
    const measure = typeScale(fontSize);
    const rateLabels = items
      .slice(0, -1)
      .map((stage, i) => labelRate(stage.value, items[i + 1]!.value));
    const rateW = rates
      ? Math.max(
          0,
          ...rateLabels.map((label) => textWidth(label, measure.axis.px)),
        )
      : 0;
    const W = resolveWidth(width);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      right: rates ? W - PAD - Math.ceil(rateW) - RATE_GAP : undefined,
    });
    const { left, right, top, bottom, T } = F;
    const first = items[0]?.value || 1;
    const rowH = (bottom - top) / Math.max(1, items.length);
    const full = right - left;
    const cx = (left + right) / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
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
          const stageLabel = truncate(
            stage.label,
            T.onSeries.px,
            Math.max(
              0,
              full -
                LABEL_PAD * 2 -
                (showRates ? textWidth(` · ${rate}%`, T.onSeries.px) : 0),
            ),
          );
          return (
            <g key={stage.label} data-part="mark" data-i={i}>
              <path
                d={`M${round(cx - w0 / 2)} ${round(y)} H${round(cx + w0 / 2)} L${round(cx + w1 / 2)} ${round(y + rowH - STAGE_GAP)} H${round(cx - w1 / 2)} Z`}
                fill={ACCENT}
                opacity={alpha(Math.max(0.2, 0.92 - i * 0.17))}
              />
              <text
                x={round(cx)}
                y={round(mid)}
                textAnchor="middle"
                dominantBaseline="central"
                {...T.onSeries.attrs}
              >
                {stageLabel}
                {showRates ? ` · ${rate}%` : ""}
              </text>
              {rates && items[i + 1] ? (
                <text
                  x={round(
                    Math.min(F.width - PAD - rateW, cx + w1 / 2 + RATE_GAP),
                  )}
                  y={round(y + rowH - STAGE_GAP / 2)}
                  {...T.axis.attrs}
                >
                  {labelRate(stage.value, items[i + 1]!.value)}
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
