import type { MicroBaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { round } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { MicroSvg } from "../svg";

export type SplitBarProps = MicroBaseProps & {
  a: Item;
  b: Item;
};

/** Inline two way share: a in the accent, b in ink. */
export const SplitBar = forwardRef<SVGSVGElement, SplitBarProps>(
  ({ a, b, title, className, ...rest }, ref) => {
    const total = a.value + b.value || 1;
    const w = (a.value / total) * 60;
    return (
      <MicroSvg
        ref={ref}
        {...rest}
        vw={60}
        vh={20}
        em={1}
        title={title}
        className={className}
      >
        <rect
          x="0"
          y="6.5"
          width={round(Math.max(w - 0.7, 1))}
          height="7"
          fill={ACCENT}
          opacity="0.85"
          data-part="mark"
          data-series={a.label}
        />
        <rect
          x={round(Math.min(w + 0.7, 59))}
          y="6.5"
          width={round(Math.max(60 - w - 0.7, 1))}
          height="7"
          fill={ink(0.2)}
          data-part="mark"
          data-series={b.label}
        />
      </MicroSvg>
    );
  },
);

SplitBar.displayName = "SplitBar";
