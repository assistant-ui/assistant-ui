import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Pt, ScaleKind } from "../../core/types";
import { extent, hexPath, positiveExtent, project } from "../../core/geometry";
import { ACCENT, seqOpacity } from "../../core/theme";
import { hexbin } from "../../core/layout";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type HexbinProps = BaseProps & {
  points: Pt[];
  radius?: number;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  xLabel?: string;
  yLabel?: string;
};

export const Hexbin = forwardRef<SVGSVGElement, HexbinProps>(
  (
    {
      points,
      radius = 8.6,
      xScale = "linear",
      yScale = "linear",
      xLabel,
      yLabel,
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
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [xLo, xHi] = xScale === "log" ? positiveExtent(xs) : extent(xs);
    const [yLo, yHi] = yScale === "log" ? positiveExtent(ys) : extent(ys);
    const X = project(xScale, xLo, xHi, 14, 182);
    const Y = project(yScale, yLo, yHi, 10, vh - 24);
    const projected = points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    const bins = hexbin(projected, radius, 200, vh - 18);
    const max = Math.max(...bins.map((b) => b.count), 1);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
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
          <text x="130" y={vh - 5} textAnchor="end" {...T.axis}>
            low
          </text>
          <text x="180" y={vh - 5} {...T.axis}>
            high
          </text>
        </g>
        {yLabel ? (
          <text
            x="4"
            y={vh / 2 - 6}
            transform={`rotate(-90 4 ${vh / 2 - 6})`}
            textAnchor="middle"
            {...T.axis}
          >
            {yLabel}
          </text>
        ) : null}
        {xLabel ? (
          <text x="100" y={vh - 3} textAnchor="middle" {...T.axis}>
            {xLabel}
          </text>
        ) : null}
      </ChartSvg>
    );
  },
);

Hexbin.displayName = "Hexbin";
