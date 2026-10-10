import type { MicroBaseProps } from "../svg";
import { forwardRef } from "react";
import { stroke } from "../../core/geometry";
import { GRID, NEG, POS } from "../../core/theme";
import { MicroSvg } from "../svg";

export type WinLossProps = MicroBaseProps & {
  data: number[];
};

/** Inline outcome ticks: the sign of each value is the whole story. */
export const WinLoss = forwardRef<SVGSVGElement, WinLossProps>(
  ({ data, title, className, ...rest }, ref) => {
    const step = 60 / Math.max(1, data.length);
    const width = Math.max(step * 0.6, 1);
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
        <line
          x1="0"
          y1="10"
          x2="60"
          y2="10"
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {data.map((v, i) => (
          <rect
            key={i}
            x={step * i + (step - width) / 2}
            y={v >= 0 ? 2.5 : 11}
            width={width}
            height={6.5}
            rx={Math.min(1.2, width / 2)}
            fill={v >= 0 ? POS : NEG}
            opacity={v >= 0 ? 0.85 : 0.7}
            data-part="mark"
            data-i={i}
          />
        ))}
      </MicroSvg>
    );
  },
);

WinLoss.displayName = "WinLoss";
