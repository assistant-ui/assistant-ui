import type { BaseProps } from "../svg";
import { round, rowMarkH, rowMid } from "../../core/geometry";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type LeaderboardProps = BaseProps & {
  items: Item[];
  showValues?: boolean;
};

export const Leaderboard = forwardRef<SVGSVGElement, LeaderboardProps>(
  (
    {
      items,
      showValues = true,
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
    const { left, right, top, bottom } = plotFrame(vh, density, {
      left: density === "figure" ? 52 : 48,
    });
    const max = Math.max(...items.map((r) => r.value), 1);
    const rowH = (bottom - top) / Math.max(1, items.length);
    const barH = Math.min(8.5, rowMarkH(rowH, 0.5));
    const valuePad = showValues ? 18 : 0;
    const trackW = right - left - valuePad;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {items.map((row, i) => {
          const mid = rowMid(i, rowH, top);
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 4}
                y={mid}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label}
              >
                {row.label}
              </text>
              <rect
                x={left}
                y={round(mid - barH / 2)}
                width={trackW}
                height={barH}
                fill={ink(0.08)}
              />
              <rect
                x={left}
                y={round(mid - barH / 2)}
                width={round(Math.max((row.value / max) * trackW, 4))}
                height={barH}
                fill={i === 0 ? ACCENT : ink(0.4)}
              />
              {showValues && (
                <text
                  x={right}
                  y={mid}
                  dominantBaseline="central"
                  textAnchor="end"
                  {...T.axis}
                >
                  {format(row.value)}
                </text>
              )}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Leaderboard.displayName = "Leaderboard";
