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
  (
    { colorScale: colorScaleProp, style, onMouseEnter, onMouseLeave, ...props },
    ref,
  ) => {
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
      <div
        ref={ref}
        style={mergedStyle}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          if (event.defaultPrevented) return;
          dispatch?.onCellEnter(cell, event.currentTarget);
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event);
          if (event.defaultPrevented) return;
          dispatch?.onCellLeave();
        }}
        {...props}
      />
    );
  },
);

Cell.displayName = "HeatGraph.Cell";
