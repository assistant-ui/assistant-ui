import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import type { Guide } from "../../core/types";
import { extent, linear, round, rowMid, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  PAD,
  SvgLegend,
  frame,
  resolveWidth,
  typeScale,
} from "../svg";

export type DumbbellProps = BaseProps & {
  items: { label: string; from: number; to: number }[];
  fromLabel?: string;
  toLabel?: string;
  guides?: readonly Guide[];
};

/** The share of the width row labels may take before they are cut. */
const LABEL_SHARE = 0.4;

export const Dumbbell = forwardRef<SVGSVGElement, DumbbellProps>(
  (
    {
      items,
      fromLabel = "before",
      toLabel = "after",
      guides,
      legend,
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
    const showLegend = legend ?? true;
    const [lo, hi] = extent([
      ...items.flatMap((row) => [row.from, row.to]),
      ...(guides?.map((guide) => guide.at) ?? []),
    ]);
    const measured = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelW = Math.max(
      0,
      ...items.map((row) => textWidth(row.label, measured.label.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      left: Math.min(Math.round(W * LABEL_SHARE), Math.ceil(PAD + labelW + 6)),
    });
    const { left, right, top, bottom, T } = F;
    const X = linear(lo, hi, left, right);
    const rowH = (bottom - top) / Math.max(1, items.length);
    const Y = (i: number) => top + (i + 0.5) * rowH;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <Guides
          guides={(guides ?? []).map((g) => ({
            at: g.at,
            axis: g.axis ?? ("x" as const),
            ...(g.label ? { label: g.label } : {}),
          }))}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        {showLegend && (
          <SvgLegend
            frame={F}
            names={[fromLabel, toLabel]}
            colors={[ink(0.45), ACCENT]}
            x={F.width - PAD}
            anchor="end"
          />
        )}
        {items.map((row, i) => {
          const y = rowMid(i, rowH, top);
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={round(left - 6)}
                y={round(y)}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - PAD - 6)}
              </text>
              <line
                x1={round(X(row.from))}
                y1={round(y)}
                x2={round(X(row.to))}
                y2={round(y)}
                stroke={ink(0.25)}
                {...stroke.line}
              />
              <circle
                cx={round(X(row.from))}
                cy={round(y)}
                r={4}
                fill={ink(0.45)}
              />
              <circle cx={round(X(row.to))} cy={round(y)} r={4} fill={ACCENT} />
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Dumbbell.displayName = "Dumbbell";
