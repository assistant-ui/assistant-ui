import type { MicroBaseProps } from "../svg";
import { forwardRef } from "react";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { MicroSvg } from "../svg";

export type SparklineProps = MicroBaseProps & {
  data: number[];
  fill?: boolean;
};

/** Inline trend, one line of text tall. */
export const Sparkline = forwardRef<SVGSVGElement, SparklineProps>(
  ({ data, fill, title, className, ...rest }, ref) => {
    const pts = scalePoints(data, 2, 58, 17, 3, Math.min(...data, 0));
    const last = pts[pts.length - 1];
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
        {fill && (
          <path
            d={areaPath(pts, 18)}
            fill={ACCENT}
            opacity="0.12"
            data-part="mark"
          />
        )}
        <path
          d={linePath(pts)}
          fill="none"
          stroke={ink(0.6)}
          data-part="mark"
          {...stroke.medium}
        />
        {last && (
          <circle
            cx={last.x}
            cy={last.y}
            r="2"
            fill={ACCENT}
            data-part="mark"
          />
        )}
      </MicroSvg>
    );
  },
);

Sparkline.displayName = "Sparkline";
