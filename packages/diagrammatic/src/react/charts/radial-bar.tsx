import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { arcStroke } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { cat, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type RadialBarProps = BaseProps & {
  items: { label: string; value: number; max?: number }[];
};

export const RadialBar = forwardRef<SVGSVGElement, RadialBarProps>(
  (
    {
      items,
      format,
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
    const T = typeScale(fontSize);
    const W = resolveWidth(width);
    const fmt =
      format ??
      ((v: number) => (v <= 1 ? `${Math.round(v * 100)}%` : String(v)));
    const labelW = Math.max(
      0,
      ...items.map((item) => textWidth(item.label, T.label.px)),
    );
    const valueW = Math.max(
      0,
      ...items.map((item) => textWidth(fmt(item.value), T.value.px)),
    );
    const dotR = 3;
    const listGap = 6;
    const listW = 12 + dotR + listGap * 2 + labelW + valueW;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      right: Math.min(W - PAD, Math.max(PAD + 2 * T.base, W - PAD - listW)),
    });
    const { left, right, top, bottom, T: frameType } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const outer = Math.max(0, Math.min(right - left, bottom - top) / 2 - 8);
    const ringStroke = Math.max(3, Math.min(18, outer * 0.11));
    const ringGap = Math.max(4, ringStroke * 0.7);
    const ringStep = Math.min(
      ringStroke + ringGap,
      Math.max(0, outer - ringStroke / 2) / Math.max(1, items.length - 1),
    );
    const rowH = Math.min(
      Math.max(18, frameType.label.px + 6),
      (bottom - top) / Math.max(1, items.length),
    );
    const dotX = Math.min(F.width - PAD, right + 12);
    const labelX = Math.min(F.width - PAD, dotX + dotR + listGap);
    const valueX = F.width - PAD;
    const labelBudget = Math.max(0, valueX - valueW - listGap - labelX);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {items.map((item, i) => {
          const r = Math.max(ringStroke / 2, outer - i * ringStep);
          const max = item.max ?? 1;
          const share =
            max > 0 ? Math.max(0, Math.min(1, item.value / max)) : 0;
          const rowY = cy - ((items.length - 1) / 2) * rowH + i * rowH;
          return (
            <g key={item.label} data-part="mark" data-i={i}>
              <g fill="none" strokeLinecap="round" strokeWidth={ringStroke}>
                <circle cx={cx} cy={cy} r={r} stroke={ink(0.08)} />
                <path
                  d={arcStroke(cx, cy, r, 0, share * Math.PI * 2 * 0.9999)}
                  stroke={cat(i)}
                  opacity="0.9"
                />
              </g>
              <circle cx={dotX} cy={rowY} r={dotR} fill={cat(i)} />
              <text
                x={labelX}
                y={rowY}
                dominantBaseline="central"
                {...frameType.label.attrs}
              >
                {truncate(item.label, frameType.label.px, labelBudget)}
              </text>
              <text
                x={valueX}
                y={rowY}
                textAnchor="end"
                dominantBaseline="central"
                {...frameType.value.attrs}
              >
                {fmt(item.value)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

RadialBar.displayName = "RadialBar";
