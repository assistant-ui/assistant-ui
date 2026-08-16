import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { stroke } from "../../core/geometry";
import { C } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

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
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const cy = vh / 2;
    const r = Math.min(cy - 12, 38);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <circle
          cx={100 - r * 0.58}
          cy={cy}
          r={r}
          fill={C[0]}
          fillOpacity="0.2"
          stroke={C[0]}
          strokeOpacity="0.7"
          data-part="mark"
          data-series={a.label}
          {...stroke.medium}
        />
        <circle
          cx={100 + r * 0.58}
          cy={cy}
          r={r}
          fill={C[2]}
          fillOpacity="0.2"
          stroke={C[2]}
          strokeOpacity="0.7"
          data-part="mark"
          data-series={b.label}
          {...stroke.medium}
        />
        <text
          x={100 - r}
          y={cy - 4}
          textAnchor="middle"
          fontSize="3.2"
          fill={C[0]}
          fontFamily={T.axis.fontFamily}
        >
          {a.label}
        </text>
        <text x={100 - r} y={cy + 4} textAnchor="middle" {...T.value}>
          {format(a.value)}
        </text>
        <text
          x={100 + r}
          y={cy - 4}
          textAnchor="middle"
          fontSize="3.2"
          fill={C[2]}
          fontFamily={T.axis.fontFamily}
        >
          {b.label}
        </text>
        <text x={100 + r} y={cy + 4} textAnchor="middle" {...T.value}>
          {format(b.value)}
        </text>
        <text x="100" y={cy - 4} textAnchor="middle" {...T.axis}>
          both
        </text>
        <text x="100" y={cy + 4} textAnchor="middle" {...T.value}>
          {format(overlap)}
        </text>
      </ChartSvg>
    );
  },
);

Venn.displayName = "Venn";
