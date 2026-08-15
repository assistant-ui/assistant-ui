import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { areaPath, clamp01, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, GRID } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type HorizonProps = BaseProps & { data: number[]; bands?: 2 | 3 };

const OPACITIES = [0.25, 0.5, 0.85];

export const Horizon = forwardRef<SVGSVGElement, HorizonProps>(
  ({ data, bands = 3, labels, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = labels ? vh - 16 : vh - 8;
    const max = Math.max(...data, 1);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="10"
          y1={bottom}
          x2="190"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {Array.from({ length: bands }, (_, layer) => {
          const values = data.map((v) => clamp01((v / max) * bands - layer));
          const pts = scalePoints(values, 10, 190, bottom, 18, 0, 1);
          return (
            <path
              key={layer}
              d={areaPath(pts, bottom)}
              fill={ACCENT}
              opacity={OPACITIES[layer] ?? 0.9}
              data-part="mark"
              data-i={layer}
            />
          );
        })}
        <text x="190" y="10" textAnchor="end" {...TXT.axis}>
          {bands} bands · darker = higher
        </text>
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) => 10 + (i * 180) / Math.max(1, labels.length - 1),
            )}
            y={vh - 4}
          />
        )}
      </ChartSvg>
    );
  },
);

Horizon.displayName = "Horizon";
