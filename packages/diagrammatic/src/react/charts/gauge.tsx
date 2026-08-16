import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { polar, round } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type GaugeProps = BaseProps & {
  value: number;
  display?: string;
  label?: string;
  min?: string;
  max?: string;
};

function semiArc(cx: number, cy: number, r: number, share: number): string {
  const a0 = -Math.PI;
  const a1 = a0 + Math.max(0.001, Math.min(1, share)) * Math.PI;
  const start = polar(cx, cy, r, a0);
  const end = polar(cx, cy, r, a1);
  return `M${round(start.x)} ${round(start.y)} A${r} ${r} 0 0 1 ${round(end.x)} ${round(end.y)}`;
}

/** A single bounded value, 0 to 1, on a half dial. */
export const Gauge = forwardRef<SVGSVGElement, GaugeProps>(
  (
    {
      value,
      display,
      label,
      min = "0",
      max = "100",
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const cy = vh - 26;
    const r = Math.min(cy - 10, 54);
    const share = Math.max(0, Math.min(1, value));
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <path
          d={semiArc(100, cy, r, 1)}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={ink(0.08)}
          data-part="grid"
        />
        <path
          d={semiArc(100, cy, r, share)}
          fill="none"
          stroke={ACCENT}
          strokeWidth="9"
          strokeLinecap="round"
          data-part="mark"
        />
        <text
          x="100"
          y={cy - 8}
          textAnchor="middle"
          fontSize="11.5"
          fill={ink(0.85)}
          fontFamily={TXT.value.fontFamily}
        >
          {display ?? `${Math.round(share * 100)}%`}
        </text>
        {label && (
          <text x="100" y={cy + 2} textAnchor="middle" {...TXT.axis}>
            {label}
          </text>
        )}
        <text x={100 - r} y={cy + 12} textAnchor="middle" {...TXT.axis}>
          {min}
        </text>
        <text x={100 + r} y={cy + 12} textAnchor="middle" {...TXT.axis}>
          {max}
        </text>
      </ChartSvg>
    );
  },
);

Gauge.displayName = "Gauge";
