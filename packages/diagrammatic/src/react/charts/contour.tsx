import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Pt } from "../../core/types";
import { extent, round, stroke } from "../../core/geometry";
import { ACCENT } from "../../core/theme";
import { densityEllipse } from "../../core/layout";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type ContourProps = BaseProps & {
  points: Pt[];
  xLabel?: string;
  yLabel?: string;
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
    { points, xLabel, yLabel, title, aspect, density, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const [xLo, xHi] = extent(points.map((p) => p.x));
    const [yLo, yHi] = extent(points.map((p) => p.y));
    const projected = points.map((p) => ({
      x: 20 + ((p.x - xLo) / (xHi - xLo || 1)) * 160,
      y: vh - 22 - ((p.y - yLo) / (yHi - yLo || 1)) * (vh - 40),
    }));
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
