import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, NEG, POS, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type KpiTileProps = BaseProps & {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" };
  trend?: number[];
};

/**
 * The one composed component: headline value, its change, and its recent past.
 * `value` and `delta.value` arrive pre-formatted; the tile prints, it does not
 * do math.
 */
export const KpiTile = forwardRef<SVGSVGElement, KpiTileProps>(
  ({ label, value, delta, trend, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const pts = trend
      ? scalePoints(trend, 112, 182, vh - 24, vh - 58, Math.min(...trend, 0))
      : [];
    const last = pts[pts.length - 1];
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <rect
          x="14"
          y="18"
          width="172"
          height={vh - 36}
          rx="8"
          fill="none"
          stroke={ink(0.12)}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          data-part="grid"
        />
        <text
          x="30"
          y="42"
          fontSize="6.5"
          fill={ink(0.45)}
          fontFamily={TXT.axis.fontFamily}
        >
          {label}
        </text>
        <text
          x="29"
          y={vh / 2 + 14}
          fontSize="22"
          fill={ink(0.9)}
          fontFamily={TXT.value.fontFamily}
          data-part="mark"
        >
          {value}
        </text>
        {delta && (
          <text
            x="30"
            y={vh - 28}
            fontSize="7"
            fill={delta.direction === "up" ? POS : NEG}
            fontFamily={TXT.axis.fontFamily}
          >
            {delta.direction === "up" ? "▲" : "▼"} {delta.value}
          </text>
        )}
        {pts.length > 0 && (
          <g data-part="mark">
            <path d={areaPath(pts, vh - 24)} fill={ACCENT} opacity="0.12" />
            <path
              d={linePath(pts)}
              fill="none"
              stroke={ACCENT}
              {...stroke.medium}
            />
            {last && <circle cx={last.x} cy={last.y} r="2.2" fill={ACCENT} />}
          </g>
        )}
      </ChartSvg>
    );
  },
);

KpiTile.displayName = "KpiTile";
