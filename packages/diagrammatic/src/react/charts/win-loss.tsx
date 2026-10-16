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
        {data.map((v, i) => {
          const win = v > 0;
          const loss = v < 0;
          return (
            <rect
              key={i}
              x={step * i + (step - width) / 2}
              y={win ? 2.5 : loss ? 11 : 9.5}
              width={width}
              height={win || loss ? 6.5 : 1}
              rx={Math.min(1.2, width / 2)}
              fill={win ? POS : loss ? NEG : GRID}
              opacity={win ? 0.85 : loss ? 0.7 : 1}
              data-part="mark"
              data-i={i}
            />
          );
        })}
      </MicroSvg>
    );
  },
);

WinLoss.displayName = "WinLoss";
