"use client";

import { type ComponentPropsWithoutRef, forwardRef, useMemo } from "react";
import {
  useCellContext,
  useHeatGraphContext,
  useTooltipDispatch,
} from "../context";

export type CellProps = ComponentPropsWithoutRef<"div"> & {
  colorScale?: string[];
};

export const Cell = forwardRef<HTMLDivElement, CellProps>(
  ({ colorScale: colorScaleProp, style, ...props }, ref) => {
    const cell = useCellContext();
    const { colorScale: colorScaleCtx } = useHeatGraphContext();
    const dispatch = useTooltipDispatch();
    const colors = colorScaleProp ?? colorScaleCtx;

    const mergedStyle = useMemo(
      () => ({
        gridColumn: cell.column + 1,
        gridRow: cell.row + 1,
        backgroundColor: colors?.[cell.level],
        ...style,
      }),
      [cell.column, cell.row, cell.level, colors, style],
    );

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: hover interaction for tooltip
      <div
        ref={ref}
        style={mergedStyle}
        onMouseEnter={
          dispatch
            ? (e) => dispatch.onCellEnter(cell, e.currentTarget)
            : undefined
        }
        onMouseLeave={dispatch?.onCellLeave}
        {...props}
      />
    );
  },
);

Cell.displayName = "HeatGraph.Cell";
