import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { barPath } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

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
    const trackW = showValues ? 122 : 138;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {items.map((row, i) => {
          const y = 10 + i * rowH;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x="14"
                y={y + 6.2}
                fontSize="6"
                fill={ink(0.6)}
                fontFamily={TXT.axis.fontFamily}
              >
                {row.label}
              </text>
              <rect
                x="48"
                y={y}
                width={trackW}
                height="8.5"
                rx="4.25"
                fill={ink(0.08)}
              />
              <path
                d={barPath(
                  48,
                  y,
                  Math.max((row.value / max) * trackW, 4),
                  8.5,
                  4.25,
                  "right",
                )}
                fill={i === 0 ? ACCENT : ink(0.4)}
              />
              {showValues && (
                <text
                  x="186"
                  y={y + 6.2}
                  fontSize="6"
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
