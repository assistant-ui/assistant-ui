import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, linear, round, stroke } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type SlopeProps = BaseProps & {
  items: { label: string; from: number; to: number }[];
  highlight?: string;
};

export const Slope = forwardRef<SVGSVGElement, SlopeProps>(
  (
    {
      items,
      highlight,
      labels,
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
    const W = resolveWidth(width);
    const type = typeScale(fontSize);
    const widest = Math.max(
      0,
      ...items.map((item) => textWidth(item.label, type.axis.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(labels),
      right: W - PAD - Math.ceil(widest) - 6,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const [lo, hi] = extent(items.flatMap((r) => [r.from, r.to]));
    const Y = linear(lo, hi, bottom, top);
    const span = right - left;
    const fromX = left + span * 0.2;
    const toX = right - span * 0.2;
    const startLabelWidth = Math.max(0, (fromX - PAD) * 2);
    const endLabelWidth = Math.max(
      0,
      Math.min(toX - PAD, F.width - PAD - toX) * 2,
    );
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <line
          x1={round(fromX)}
          y1={top}
          x2={round(fromX)}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1={round(toX)}
          y1={top}
          x2={round(toX)}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {labels?.[0] && (
          <text
            x={round(fromX)}
            y={axisY}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {truncate(labels[0], T.axis.px, startLabelWidth)}
          </text>
        )}
        {labels?.[1] && (
          <text x={round(toX)} y={axisY} textAnchor="middle" {...T.axis.attrs}>
            {truncate(labels[1], T.axis.px, endLabelWidth)}
          </text>
        )}
        {items.map((row, i) => {
          const accent = highlight !== undefined && row.label === highlight;
          const color = accent ? ACCENT : ink(0.4);
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <line
                x1={round(fromX)}
                y1={round(Y(row.from))}
                x2={round(toX)}
                y2={round(Y(row.to))}
                stroke={color}
                {...(accent ? stroke.line : stroke.medium)}
              />
              <circle
                cx={round(fromX)}
                cy={round(Y(row.from))}
                r={3}
                fill={color}
              />
              <circle
                cx={round(toX)}
                cy={round(Y(row.to))}
                r={3}
                fill={color}
              />
              <text
                x={round(toX + 6)}
                y={round(Y(row.to))}
                dominantBaseline="central"
                {...T.axis.attrs}
                fill={accent ? ACCENT : T.axis.attrs.fill}
              >
                {truncate(row.label, T.axis.px, F.width - PAD - (toX + 6))}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Slope.displayName = "Slope";
