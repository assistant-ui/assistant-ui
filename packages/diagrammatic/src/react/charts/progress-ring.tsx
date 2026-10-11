import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { arcStroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, frame, typeSize } from "../svg";

export type ProgressRingProps = BaseProps & {
  value: number;
  display?: string;
  label?: string;
};

/** A single completion state, 0 to 1, wrapped in a ring. */
export const ProgressRing = forwardRef<SVGSVGElement, ProgressRingProps>(
  (
    {
      value,
      display,
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3);
    const { left, right, top, bottom, T } = F;
    const labelReserve = label ? T.axis.px * 2 + 8 : 0;
    const cx = (left + right) / 2;
    const cy = (top + bottom - labelReserve) / 2;
    const r = Math.min(
      (right - left) / 2.28,
      (bottom - top - labelReserve) / 2.28,
    );
    const valueSize = typeSize(T, Math.min(6, r / 26, r / T.base));
    const labelSize = typeSize(T, Math.min(2, r / 69, r / T.base));
    const strokeWidth = r * 0.28;
    const share = Math.max(0, Math.min(1, value));
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={ink(0.08)}
          data-part="grid"
        />
        <path
          d={arcStroke(cx, cy, r, 0, share * Math.PI * 2 * 0.9999)}
          fill="none"
          stroke={ACCENT}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          data-part="mark"
        />
        <text
          x={cx}
          y={cy + 3}
          textAnchor="middle"
          {...T.value.attrs}
          fontSize={valueSize.fontSize}
          fill={ink(0.8)}
        >
          {display ?? `${Math.round(share * 100)}%`}
        </text>
        {label && (
          <text
            x={cx}
            y={cy + r * 1.14 + labelSize.px}
            textAnchor="middle"
            {...T.axis.attrs}
            fontSize={labelSize.fontSize}
          >
            {label}
          </text>
        )}
      </ChartSvg>
    );
  },
);

ProgressRing.displayName = "ProgressRing";
