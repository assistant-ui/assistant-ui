import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { round, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type BulletProps = BaseProps & {
  value: number;
  target: number;
  bands: [number, number, number];
  label?: string;
};

/** One measure against a target line and three qualitative bands. */
export const Bullet = forwardRef<SVGSVGElement, BulletProps>(
  (
    { value, target, bands, label, title, aspect, density, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 25 / 4);
    const T = typeScale(density);
    const max = Math.max(bands[2], value, target, 1);
    const X = (v: number) => (label ? 34 : 4) + (v / max) * (label ? 156 : 188);
    const x0 = label ? 34 : 4;
    const mid = vh / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {label && (
          <text x="4" y={mid} dominantBaseline="central" {...T.axis}>
            {label}
          </text>
        )}
        {bands.map((band, i) => (
          <rect
            key={i}
            x={x0}
            y={mid - 6.5}
            width={X(band) - x0}
            height="13"
            fill={ink([0.14, 0.09, 0.05][i]!)}
            data-part="grid"
          />
        ))}
        <rect
          x={round(x0)}
          y={round(mid - 2.5)}
          width={round(X(value) - x0)}
          height="5"
          fill={ink(0.8)}
          data-part="mark"
        />
        <line
          x1={X(target)}
          y1={mid - 9}
          x2={X(target)}
          y2={mid + 9}
          stroke={ACCENT}
          data-part="mark"
          {...stroke.line}
        />
      </ChartSvg>
    );
  },
);

Bullet.displayName = "Bullet";
