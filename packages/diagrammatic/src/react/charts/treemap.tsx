import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { TreeNode } from "../../core/types";
import { formatCompact } from "../../core/types";
import { nodeValue, squarify } from "../../core/layout";
import { cat } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type TreemapProps = BaseProps & { root: TreeNode; depth?: number };

export const Treemap = forwardRef<SVGSVGElement, TreemapProps>(
  (
    {
      root,
      depth = 2,
      format = formatCompact,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const children = root.children ?? [];
    const outer = squarify(
      children.map(nodeValue),
      { x: 8, y: 8, w: 184, h: vh - 16 },
      2.4,
    );
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {children.map((child, i) => {
          const rect = outer[i]!;
          const grandchildren = depth >= 2 ? (child.children ?? []) : [];
          const innerRects =
            grandchildren.length > 0
              ? squarify(grandchildren.map(nodeValue), rect, 2)
              : [];
          const labelFits = rect.w > 26 && rect.h > 14;
          return (
            <g
              key={child.label}
              data-part="mark"
              data-i={i}
              data-series={child.label}
            >
              {grandchildren.length === 0 ? (
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  fill={cat(i)}
                  opacity="0.85"
                />
              ) : (
                grandchildren.map((grandchild, k) => {
                  const r = innerRects[k]!;
                  return (
                    <rect
                      key={grandchild.label}
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill={cat(i)}
                      opacity={k % 2 === 0 ? 0.85 : 0.55}
                    />
                  );
                })
              )}
              {labelFits && (
                <text x={rect.x + 5} y={rect.y + 9} {...TXT.onSeries}>
                  {child.label}
                </text>
              )}
              {labelFits && rect.h > 24 && (
                <text
                  x={rect.x + 5}
                  y={rect.y + 16.5}
                  {...TXT.onSeries}
                  opacity="0.7"
                >
                  {format(nodeValue(child))}
                </text>
              )}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Treemap.displayName = "Treemap";
