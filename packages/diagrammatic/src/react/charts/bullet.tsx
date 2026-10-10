import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { round, stroke } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type BulletProps = BaseProps & {
  value: number;
  target: number;
  bands: [number, number, number];
  label?: string;
};

/** One measure against a target line and three qualitative bands. */
export const Bullet = forwardRef<SVGSVGElement, BulletProps>(
  (
    {
      value,
      target,
      bands,
      label,
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
    const T0 = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelGutter = label
      ? Math.min(
          Math.round(W * 0.4),
          Math.ceil(PAD + textWidth(label, T0.axis.px) + 8),
        )
      : undefined;
    const F = frame({ width, height, aspect, fontSize }, 25 / 4, {
      left: labelGutter,
    });
    const { left, right, top, bottom, T } = F;
    const max = Math.max(bands[2], value, target, 1);
    const X = (v: number) => left + (v / max) * (right - left);
    const mid = (top + bottom) / 2;
    const bandH = Math.min(32, bottom - top - 8);
    const valueH = Math.max(5, bandH * 0.38);
    const targetH = Math.min(bottom - top, bandH + 12);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {label && (
          <text
            x={PAD}
            y={round(mid)}
            dominantBaseline="central"
            {...T.axis.attrs}
          >
            {truncate(label, T.axis.px, Math.max(0, left - PAD - 6))}
          </text>
        )}
        {bands.map((band, i) => (
          <rect
            key={i}
            x={round(left)}
            y={round(mid - bandH / 2)}
            width={round(X(band) - left)}
            height={round(bandH)}
            fill={ink([0.14, 0.09, 0.05][i]!)}
            data-part="grid"
          />
        ))}
        <rect
          x={round(left)}
          y={round(mid - valueH / 2)}
          width={round(X(value) - left)}
          height={round(valueH)}
          fill={ink(0.8)}
          data-part="mark"
        />
        <line
          x1={X(target)}
          y1={round(mid - targetH / 2)}
          x2={X(target)}
          y2={round(mid + targetH / 2)}
          stroke={ACCENT}
          data-part="mark"
          {...stroke.line}
        />
      </ChartSvg>
    );
  },
);

Bullet.displayName = "Bullet";
