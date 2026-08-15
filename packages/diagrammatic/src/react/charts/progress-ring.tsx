import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { arcStroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type ProgressRingProps = BaseProps & {
  value: number;
  display?: string;
  label?: string;
};

/** A single completion state, 0 to 1, wrapped in a ring. */
export const ProgressRing = forwardRef<SVGSVGElement, ProgressRingProps>(
  ({ value, display, label, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const cy = vh / 2 - (label ? 4 : 0);
    const r = Math.min(cy - 8, 26);
    const share = Math.max(0, Math.min(1, value));
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <circle
          cx="100"
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={r * 0.28}
          stroke={ink(0.08)}
          data-part="grid"
        />
        <path
          d={arcStroke(100, cy, r, 0, share * Math.PI * 2 * 0.9999)}
          fill="none"
          stroke={ACCENT}
          strokeWidth={r * 0.28}
          strokeLinecap="round"
          data-part="mark"
        />
        <text
          x="100"
          y={cy + 3}
          textAnchor="middle"
          fontSize={r * 0.42}
          fill={ink(0.8)}
          fontFamily={TXT.value.fontFamily}
        >
          {display ?? `${Math.round(share * 100)}%`}
        </text>
        {label && (
          <text x="100" y={cy + r + 12} textAnchor="middle" {...TXT.axis}>
            {label}
          </text>
        )}
      </ChartSvg>
    );
  },
);

ProgressRing.displayName = "ProgressRing";
