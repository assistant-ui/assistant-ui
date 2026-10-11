import type { MicroBaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { round } from "../../core/geometry";
import { splitWidths } from "../../core/layout";
import { ACCENT, cat, ink } from "../../core/theme";
import { MicroSvg } from "../svg";

export type SplitBarProps = MicroBaseProps & {
  a?: Item;
  b?: Item;
  items?: Item[];
  min?: number;
};

const VW = 60;
const GAP = 0.7;

/**
 * Inline share of a whole: two parts read as `a` in the accent against `b` in
 * ink, and `items` takes the same row past two, one categorical color each.
 * `min` floors a segment's width so a fraction of a percent stays visible and
 * hoverable, at the expense of the parts that are already wide.
 */
export const SplitBar = forwardRef<SVGSVGElement, SplitBarProps>(
  ({ a, b, items, min = 1, title, className, ...rest }, ref) => {
    const parts = items?.length
      ? items
      : [a, b].filter((part): part is Item => part !== undefined);
    const pair = !items?.length && parts.length === 2;
    const widths = splitWidths(
      parts.map((part) => part.value),
      VW,
      min,
    );
    let cursor = 0;
    return (
      <MicroSvg
        ref={ref}
        {...rest}
        vw={VW}
        vh={20}
        em={1}
        title={title}
        className={className}
      >
        {parts.map((part, i) => {
          const lead = i === 0 ? 0 : GAP;
          const trail = i === parts.length - 1 ? 0 : GAP;
          const x = cursor + lead;
          cursor += widths[i]!;
          const width = Math.max(widths[i]! - lead - trail, 0.6);
          return (
            <rect
              key={`${part.label}-${i}`}
              x={round(Math.min(x, VW - 0.6))}
              y="6.5"
              width={round(Math.min(width, Math.max(VW - x, 0.6)))}
              height="7"
              fill={pair ? (i === 0 ? ACCENT : ink(0.2)) : cat(i)}
              opacity={pair && i === 0 ? 0.85 : undefined}
              fillOpacity={pair ? undefined : 0.9}
              data-part="mark"
              data-i={i}
              data-series={part.label}
            />
          );
        })}
      </MicroSvg>
    );
  },
);

SplitBar.displayName = "SplitBar";
