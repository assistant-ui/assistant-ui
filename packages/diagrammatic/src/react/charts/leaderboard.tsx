import type { BaseProps } from "../svg";
import { round } from "../../core/geometry";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, rowMarkH, vbHeight } from "../svg";

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
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const max = Math.max(...items.map((r) => r.value), 1);
    const rowH = Math.min(21, (vh - 16) / Math.max(1, items.length));
    const trackW = showValues ? 112 : 138;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {items.map((row, i) => {
          const y = 10 + i * rowH;
          const mid = y + rowH / 2;
          const barH = Math.min(8.5, rowMarkH(rowH, 0.5));
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x="14"
                y={mid}
                dominantBaseline="central"
                fontSize="4.2"
                fill={ink(0.6)}
                fontFamily={TXT.axis.fontFamily}
              >
                {row.label}
              </text>
              <rect
                x="48"
                y={round(mid - barH / 2)}
                width={trackW}
                height={barH}
                fill={ink(0.08)}
              />
              <rect
                x="48"
                y={round(mid - barH / 2)}
                width={round(Math.max((row.value / max) * trackW, 4))}
                height={barH}
                fill={i === 0 ? ACCENT : ink(0.4)}
              />
              {showValues && (
                <text
                  x="186"
                  y={mid}
                  dominantBaseline="central"
                  fontSize="4.2"
                  textAnchor="end"
                  fill={ink(0.4)}
                  fontFamily={TXT.axis.fontFamily}
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
