import type { BaseProps, Series } from "../../core/types";
import { bandPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { NEG, POS, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type DifferenceAreaProps = BaseProps & {
  actual: Series;
  reference: Series;
};

export function DifferenceArea({
  actual,
  reference,
  labels,
  title,
  aspect,
  className,
}: DifferenceAreaProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = labels ? vh - 16 : vh - 8;
  const max = Math.max(...actual.data, ...reference.data, 1);
  const a = scalePoints(actual.data, 14, 186, bottom, 18, 0, max);
  const b = scalePoints(reference.data, 14, 186, bottom, 18, 0, max);
  const above = a.map((p, i) => ({ x: p.x, y: Math.min(p.y, b[i]!.y) }));
  const below = a.map((p, i) => ({ x: p.x, y: Math.max(p.y, b[i]!.y) }));
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      <path d={bandPath(above, b)} fill={POS} opacity="0.22" data-part="mark" />
      <path d={bandPath(b, below)} fill={NEG} opacity="0.22" data-part="mark" />
      <path
        d={linePath(b)}
        fill="none"
        stroke={ink(0.4)}
        strokeDasharray="4 4"
        data-part="mark"
        data-series={reference.name}
        {...stroke.hair}
      />
      <path
        d={linePath(a)}
        fill="none"
        stroke={ink(0.75)}
        data-part="mark"
        data-series={actual.name}
        {...stroke.line}
      />
      <g data-part="legend">
        <line
          x1="14"
          y1="9.4"
          x2="24"
          y2="9.4"
          stroke={ink(0.75)}
          {...stroke.line}
        />
        <text x="27" y="11" {...TXT.axis}>
          {actual.name}
        </text>
        <line
          x1="58"
          y1="9.4"
          x2="68"
          y2="9.4"
          stroke={ink(0.4)}
          strokeDasharray="3 3"
          {...stroke.hair}
        />
        <text x="71" y="11" {...TXT.axis}>
          {reference.name}
        </text>
        <rect
          x="112"
          y="7"
          width="6"
          height="4.5"
          rx="1"
          fill={POS}
          opacity="0.35"
        />
        <text x="121" y="11" {...TXT.axis}>
          ahead
        </text>
        <rect
          x="148"
          y="7"
          width="6"
          height="4.5"
          rx="1"
          fill={NEG}
          opacity="0.35"
        />
        <text x="157" y="11" {...TXT.axis}>
          behind
        </text>
      </g>
      {labels && (
        <AxisLabels
          labels={labels}
          xs={labels.map(
            (_, i) => 14 + (i * 172) / Math.max(1, labels.length - 1),
          )}
          y={vh - 4}
        />
      )}
    </ChartSvg>
  );
}
