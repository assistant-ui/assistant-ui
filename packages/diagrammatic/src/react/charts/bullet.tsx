import type { BaseProps } from "../../core/types";
import { barPath, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type BulletProps = BaseProps & {
  value: number;
  target: number;
  bands: [number, number, number];
  label?: string;
};

/** One measure against a target line and three qualitative bands. */
export function Bullet({
  value,
  target,
  bands,
  label,
  title,
  aspect,
  className,
}: BulletProps) {
  const vh = vbHeight(aspect, 25 / 4);
  const max = Math.max(bands[2], value, target, 1);
  const X = (v: number) => (label ? 34 : 4) + (v / max) * (label ? 156 : 188);
  const x0 = label ? 34 : 4;
  const mid = vh / 2;
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {label && (
        <text x="4" y={mid + 1.8} {...TXT.axis}>
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
          rx="3"
          fill={ink([0.14, 0.09, 0.05][i]!)}
          data-part="grid"
        />
      ))}
      <path
        d={barPath(x0, mid - 2.5, X(value) - x0, 5, 2.5, "right")}
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
}
