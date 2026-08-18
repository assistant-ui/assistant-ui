import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Pt, ScaleKind } from "../../core/types";
import {
  extent,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { ACCENT } from "../../core/theme";
import { densityEllipse } from "../../core/layout";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type ContourProps = BaseProps & {
  points: Pt[];
  xLabel?: string;
  yLabel?: string;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
};

const LEVELS = [
  { sigma: 2.2, opacity: 0.25 },
  { sigma: 1.65, opacity: 0.4 },
  { sigma: 1.1, opacity: 0.6 },
  { sigma: 0.55, opacity: 0.85 },
];

/** Density contours drawn as covariance ellipses at fixed sigma levels. */
export const Contour = forwardRef<SVGSVGElement, ContourProps>(
  (
    {
      points,
      xLabel,
      yLabel,
      xScale = "linear",
      yScale = "linear",
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
    const X = project(xScale, xLo, xHi, 20, 180);
    const Y = project(yScale, yLo, yHi, vh - 22, 18);
    const projected = points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    const ellipse = densityEllipse(projected);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {LEVELS.map((level, i) => (
          <ellipse
            key={i}
            cx={round(ellipse.cx)}
            cy={round(ellipse.cy)}
            rx={round(ellipse.rx * level.sigma)}
            ry={round(ellipse.ry * level.sigma)}
            transform={`rotate(${round(ellipse.angle)} ${round(ellipse.cx)} ${round(ellipse.cy)})`}
            fill={ACCENT}
            fillOpacity="0.045"
            stroke={ACCENT}
            strokeOpacity={level.opacity}
            data-part="mark"
            data-i={i}
            {...stroke.medium}
          />
        ))}
        {yLabel && (
          <text
            x="4"
            y={vh / 2 - 6}
            transform={`rotate(-90 4 ${vh / 2 - 6})`}
            textAnchor="middle"
            {...T.axis}
          >
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text x="100" y={vh - 3} textAnchor="middle" {...T.axis}>
            {xLabel} →
          </text>
        )}
      </ChartSvg>
    );
  },
);

Contour.displayName = "Contour";
