import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { polar, ring, round } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { ACCENT, SURFACE, seqOpacity } from "../../core/theme";
import { ChartSvg, PAD, frame, typeScale } from "../svg";

export type PolarAreaProps = BaseProps & { items: Item[] };

export const PolarArea = forwardRef<SVGSVGElement, PolarAreaProps>(
  (
    { items, title, width, height, aspect, fontSize, className, ...rest },
    ref,
  ) => {
    const T = typeScale(fontSize);
    const labelW = Math.max(
      0,
      ...items.map((item) => textWidth(item.label, T.axis.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3);
    const { left, right, top, bottom, T: frameType } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const labelGap = 6;
    const labelAllowance = Math.max(
      frameType.axis.px + labelGap,
      labelW / 2 + labelGap,
    );
    const outer = Math.max(
      0,
      Math.min(right - left, bottom - top) / 2 - labelAllowance,
    );
    const inner = Math.max(2, outer * 0.12);
    const ringStroke = Math.max(1, Math.min(4, outer * 0.035));
    const slice = (Math.PI * 2) / Math.max(1, items.length);
    const max = Math.max(...items.map((r) => r.value), 1);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {items.map((item, i) => {
          const t = item.value / max;
          return (
            <path
              key={item.label}
              d={ring(
                cx,
                cy,
                inner,
                inner + t * (outer - inner),
                i * slice,
                (i + 1) * slice,
              )}
              fill={ACCENT}
              fillOpacity={seqOpacity(t)}
              stroke={SURFACE}
              strokeWidth={ringStroke}
              data-part="mark"
              data-i={i}
            />
          );
        })}
        {items.map((item, i) => {
          const angle = i * slice + slice / 2 - Math.PI / 2;
          const p = polar(cx, cy, outer + labelGap, angle);
          const fit = Math.max(0, 2 * Math.min(p.x - PAD, F.width - PAD - p.x));
          return (
            <text
              key={item.label}
              x={round(p.x)}
              y={round(p.y)}
              textAnchor="middle"
              dominantBaseline="central"
              {...frameType.axis.attrs}
            >
              {truncate(item.label, frameType.axis.px, fit)}
            </text>
          );
        })}
      </ChartSvg>
    );
  },
);

PolarArea.displayName = "PolarArea";
