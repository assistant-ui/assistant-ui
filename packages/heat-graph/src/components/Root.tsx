"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useMemo,
  useState,
} from "react";
import {
  HeatGraphContext,
  TooltipDispatchContext,
  type TooltipState,
  TooltipStateContext,
} from "../context";
import type { CellData } from "../types";
import { type ComputeGridOptions, computeGrid } from "../utils/grid";

export type RootProps = ComponentPropsWithoutRef<"div"> &
  ComputeGridOptions & {
    colorScale?: string[];
  };

/**
 * Inner component that owns tooltip state.
 * Keeps hover-driven re-renders isolated from the grid/cell subtree.
 */
function TooltipProvider({ children }: { children: ReactNode }) {
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    hoveredCell: null,
    anchor: null,
  });

  const dispatch = useMemo(
    () => ({
      onCellEnter: (cell: CellData, element: HTMLElement) => {
        setTooltipState({ hoveredCell: cell, anchor: element });
      },
      onCellLeave: () => {
        setTooltipState({ hoveredCell: null, anchor: null });
      },
    }),
    [],
  );

  return (
    <TooltipDispatchContext value={dispatch}>
      <TooltipStateContext value={tooltipState}>{children}</TooltipStateContext>
    </TooltipDispatchContext>
  );
}

export const Root = forwardRef<HTMLDivElement, RootProps>(
  (
    { data, start, end, weekStart, classify, colorScale, children, ...props },
    ref,
  ) => {
    const state = useMemo(
      () => ({
        ...computeGrid({ data, start, end, weekStart, classify }),
        colorScale,
      }),
      [data, start, end, weekStart, classify, colorScale],
    );

    return (
      <HeatGraphContext value={state}>
        <TooltipProvider>
          <div ref={ref} {...props}>
            {children}
          </div>
        </TooltipProvider>
      </HeatGraphContext>
    );
  },
);

Root.displayName = "HeatGraph.Root";
