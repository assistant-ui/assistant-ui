import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Pt } from "../../core/types";
import { extent, hexPath } from "../../core/geometry";
import { ACCENT, seqOpacity } from "../../core/theme";
import { hexbin } from "../../core/layout";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type HexbinProps = BaseProps & { points: Pt[]; radius?: number };

export const Hexbin = forwardRef<SVGSVGElement, HexbinProps>(
  ({ points, radius = 8.6, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const [xLo, xHi] = extent(points.map((p) => p.x));
    const [yLo, yHi] = extent(points.map((p) => p.y));
    const projected = points.map((p) => ({
      x: 14 + ((p.x - xLo) / (xHi - xLo || 1)) * 168,
      y: 10 + ((p.y - yLo) / (yHi - yLo || 1)) * (vh - 34),
    }));
    const bins = hexbin(projected, radius, 200, vh - 18);
    const max = Math.max(...bins.map((b) => b.count), 1);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {bins.map((bin, i) => (
          <path
            key={i}
            d={hexPath(bin.cx, bin.cy, radius - 1)}
            fill={ACCENT}
            opacity={seqOpacity(bin.count / max)}
            data-part="mark"
            data-i={i}
          />
        ))}
        <g data-part="legend">
          {[0.15, 0.4, 0.7, 1].map((t, i) => (
            <path
              key={i}
              d={hexPath(136 + i * 11, vh - 7, 4.6)}
              fill={ACCENT}
              opacity={seqOpacity(t)}
            />
          ))}
          <text x="130" y={vh - 5} textAnchor="end" {...TXT.axis}>
            low
          </text>
          <text x="180" y={vh - 5} {...TXT.axis}>
            high
          </text>
        </g>
      </ChartSvg>
    );
  },
);

Hexbin.displayName = "Hexbin";
