import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type MirroredAreaProps = BaseProps & { down: Series; up: Series };

export const MirroredArea = forwardRef<SVGSVGElement, MirroredAreaProps>(
  ({ down, up, labels, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = labels ? vh - 18 : vh - 10;
    const mid = (12 + bottom) / 2;
    const max = Math.max(...down.data, ...up.data, 1);
    const topPts = scalePoints(down.data, 14, 186, mid - 2, 12, 0, max);
    const upPts = scalePoints(up.data, 14, 186, mid + 2, bottom, 0, max);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <path
          d={areaPath(topPts, mid - 2)}
          fill={ACCENT}
          opacity="0.22"
          data-part="mark"
          data-series={down.name}
        />
        <path
          d={linePath(topPts)}
          fill="none"
          stroke={ACCENT}
          {...stroke.line}
        />
        <path
          d={areaPath(upPts, mid + 2)}
          fill={ink(0.12)}
          data-part="mark"
          data-series={up.name}
        />
        <path
          d={linePath(upPts)}
          fill="none"
          stroke={ink(0.5)}
          {...stroke.medium}
        />
        <line
          x1="10"
          y1={mid}
          x2="190"
          y2={mid}
          stroke={ink(0.2)}
          data-part="grid"
          {...stroke.hair}
        />
        <text
          x="14"
          y="9"
          fontSize="4.5"
          fill={ACCENT}
          fontFamily={TXT.axis.fontFamily}
        >
          ↓ {down.name}
        </text>
        <text x="14" y={bottom - 2} {...TXT.axis}>
          ↑ {up.name}
        </text>
        {labels && (
          <AxisLabels labels={labels} xs={topPts.map((p) => p.x)} y={vh - 4} />
        )}
      </ChartSvg>
    );
  },
);

MirroredArea.displayName = "MirroredArea";
