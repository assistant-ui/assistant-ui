import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { truncate } from "../../core/text";
import type { TreeNode } from "../../core/types";
import { formatCompact } from "../../core/types";
import { nodeValue, squarify } from "../../core/layout";
import { cat } from "../../core/theme";
import { ChartSvg, frame } from "../svg";

export type TreemapProps = BaseProps & { root: TreeNode; depth?: number };

export const Treemap = forwardRef<SVGSVGElement, TreemapProps>(
  (
    {
      root,
      depth = 2,
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
    const children = root.children ?? [];
    const outer = squarify(
      children.map(nodeValue),
      { x: left, y: top, w: right - left, h: bottom - top },
      3,
    );
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {children.map((child, i) => {
          const rect = outer[i]!;
          const grandchildren = depth >= 2 ? (child.children ?? []) : [];
          const innerRects =
            grandchildren.length > 0
              ? squarify(grandchildren.map(nodeValue), rect, 3)
              : [];
          const tiles =
            grandchildren.length > 0
              ? grandchildren.map((node, k) => ({
                  node,
                  rect: innerRects[k]!,
                  opacity: k % 2 === 0 ? 0.85 : 0.55,
                }))
              : [{ node: child, rect, opacity: 0.85 }];
          return (
            <g key={child.label}>
              {tiles.map(({ node, rect: tile, opacity }, k) => {
                const pad = 5;
                const labelFits =
                  tile.w > pad * 2 + T.onSeries.px * 2 &&
                  tile.h > pad * 2 + T.onSeries.px;
                const valueFits =
                  labelFits && tile.h > pad * 2 + T.onSeries.px * 2 + 4;
                return (
                  <g key={`${node.label}-${k}`}>
                    <rect
                      x={tile.x}
                      y={tile.y}
                      width={tile.w}
                      height={tile.h}
                      fill={cat(i)}
                      opacity={opacity}
                      data-part="mark"
                      data-i={i}
                      data-series={node.label}
                    />
                    {labelFits && (
                      <text
                        x={tile.x + pad}
                        y={tile.y + pad + T.onSeries.px}
                        {...T.onSeries.attrs}
                      >
                        {truncate(node.label, T.onSeries.px, tile.w - pad * 2)}
                      </text>
                    )}
                    {valueFits && (
                      <text
                        x={tile.x + pad}
                        y={tile.y + pad * 2 + T.onSeries.px * 2 + 4}
                        opacity="0.7"
                        {...T.onSeries.attrs}
                      >
                        {truncate(
                          format(nodeValue(node)),
                          T.onSeries.px,
                          tile.w - pad * 2,
                        )}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Treemap.displayName = "Treemap";
