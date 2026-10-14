import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { C } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type VennProps = BaseProps & { a: Item; b: Item; overlap: number };

/** Two sets only; region area is illustrative, the numbers carry the truth. */
export const Venn = forwardRef<SVGSVGElement, VennProps>(
  (
    {
      a,
      b,
      overlap,
      format = formatCompact,
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
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const centerOffset = 0.58;
    const r = Math.max(
      0,
      Math.min(
        Math.min(right - left, bottom - top) / 2 - (T.value.px + 12),
        (right - left) / (2 * (1 + centerOffset)),
      ),
    );
    const aX = cx - r * centerOffset;
    const bX = cx + r * centerOffset;
    const centerRoom = cx - aX - 8;
    const both = truncate("both", T.axis.px, centerRoom);
    const shared = truncate(format(overlap), T.value.px, centerRoom);
    const sideRoom = (x: number, center: string, px: number) =>
      Math.max(
        0,
        Math.min(
          (x - left) * 2 - 8,
          (right - x) * 2 - 8,
          2 * (cx - aX) - textWidth(center, px) - 16,
        ),
      );
    const labelY = cy - 4;
    const valueY = cy + T.value.px + 3;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <circle
          cx={round(aX)}
          cy={round(cy)}
          r={round(r)}
          fill={C[0]}
          fillOpacity={0.2}
          stroke={C[0]}
          strokeOpacity={0.7}
          data-part="mark"
          data-series={a.label}
          {...stroke.medium}
        />
        <circle
          cx={round(bX)}
          cy={round(cy)}
          r={round(r)}
          fill={C[2]}
          fillOpacity={0.2}
          stroke={C[2]}
          strokeOpacity={0.7}
          data-part="mark"
          data-series={b.label}
          {...stroke.medium}
        />
        <text
          x={round(aX)}
          y={round(labelY)}
          textAnchor="middle"
          {...T.axis.attrs}
          fill={C[0]}
        >
          {truncate(a.label, T.axis.px, sideRoom(aX, both, T.axis.px))}
        </text>
        <text
          x={round(aX)}
          y={round(valueY)}
          textAnchor="middle"
          {...T.value.attrs}
        >
          {truncate(
            format(a.value),
            T.value.px,
            sideRoom(aX, shared, T.value.px),
          )}
        </text>
        <text
          x={round(bX)}
          y={round(labelY)}
          textAnchor="middle"
          {...T.axis.attrs}
          fill={C[2]}
        >
          {truncate(b.label, T.axis.px, sideRoom(bX, both, T.axis.px))}
        </text>
        <text
          x={round(bX)}
          y={round(valueY)}
          textAnchor="middle"
          {...T.value.attrs}
        >
          {truncate(
            format(b.value),
            T.value.px,
            sideRoom(bX, shared, T.value.px),
          )}
        </text>
        <text
          x={round(cx)}
          y={round(labelY)}
          textAnchor="middle"
          {...T.axis.attrs}
        >
          {both}
        </text>
        <text
          x={round(cx)}
          y={round(valueY)}
          textAnchor="middle"
          {...T.value.attrs}
        >
          {shared}
        </text>
      </ChartSvg>
    );
  },
);

Venn.displayName = "Venn";
