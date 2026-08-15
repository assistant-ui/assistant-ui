import type { BaseProps } from "../../core/types";
import { areaPath, linePath, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { MicroSvg } from "../svg";

export type SparklineProps = Pick<BaseProps, "title" | "className"> & {
  data: number[];
  fill?: boolean;
};

/** Inline trend, one line of text tall. */
export function Sparkline({ data, fill, title, className }: SparklineProps) {
  const pts = scalePoints(data, 2, 58, 17, 3, Math.min(...data, 0));
  const last = pts[pts.length - 1];
  return (
    <MicroSvg vw={60} vh={20} em={1} title={title} className={className}>
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
        <circle cx={last.x} cy={last.y} r="2" fill={ACCENT} data-part="mark" />
      )}
    </MicroSvg>
  );
}
