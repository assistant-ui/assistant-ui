import type { BaseProps } from "../svg";
import { round, rowMarkH, rowMid } from "../../core/geometry";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

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
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const T = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelW = Math.max(
      0,
      ...items.map((row) => textWidth(row.label, T.label.px)),
    );
    const valueW = showValues
      ? Math.max(
          0,
          ...items.map((row) => textWidth(format(row.value), T.axis.px)),
        )
      : 0;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      left: Math.min(Math.round(W * 0.4), Math.ceil(PAD + labelW + 6)),
      right: W - PAD - (showValues ? Math.ceil(valueW) + 6 : 0),
    });
    const { left, right, top, bottom, T: frameType } = F;
    const max = Math.max(...items.map((r) => r.value), 1);
    const rowH = (bottom - top) / Math.max(1, items.length);
    const barH = rowMarkH(rowH, 0.5);
    const trackW = right - left;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
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
                {...frameType.label.attrs}
              >
                {truncate(row.label, frameType.label.px, left - PAD - 6)}
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
                  x={F.width - PAD}
                  y={mid}
                  dominantBaseline="central"
                  textAnchor="end"
                  {...frameType.axis.attrs}
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
