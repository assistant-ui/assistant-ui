"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useEffect,
  useLayoutEffect,
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
import { addDays, normalizeDate } from "../utils/date-utils";
import { type ComputeGridOptions, computeGrid, emptyGrid } from "../utils/grid";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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
    <TooltipDispatchContext.Provider value={dispatch}>
      <TooltipStateContext.Provider value={tooltipState}>
        {children}
      </TooltipStateContext.Provider>
    </TooltipDispatchContext.Provider>
  );
}

export const Root = forwardRef<HTMLDivElement, RootProps>(
  (
    { data, start, end, weekStart, classify, colorScale, children, ...props },
    ref,
  ) => {
    const [today, setToday] = useState<Date>();
    useIsomorphicLayoutEffect(() => {
      if (end === undefined) setToday(new Date());
    }, [data, end]);

    const dataEnd = useMemo(() => {
      const latestDataDate = data.reduce<Date | undefined>((latest, point) => {
        const date = normalizeDate(point.date);
        if (Number.isNaN(date.getTime())) return latest;
        return latest === undefined || date > latest ? date : latest;
      }, undefined);
      if (latestDataDate === undefined || start === undefined) {
        return latestDataDate;
      }
      const maxEnd = addDays(normalizeDate(start), 364);
      return latestDataDate > maxEnd ? maxEnd : latestDataDate;
    }, [data, start]);
    const resolvedEnd = end ?? today ?? dataEnd;
    const state = useMemo(
      () => ({
        ...(resolvedEnd === undefined
          ? emptyGrid(weekStart ?? "sunday")
          : computeGrid({
              data,
              start,
              end: resolvedEnd,
              weekStart,
              classify,
            })),
        colorScale,
      }),
      [data, start, resolvedEnd, weekStart, classify, colorScale],
    );

    return (
      <HeatGraphContext.Provider value={state}>
        <TooltipProvider>
          <div ref={ref} {...props}>
            {children}
          </div>
        </TooltipProvider>
      </HeatGraphContext.Provider>
    );
  },
);

Root.displayName = "HeatGraph.Root";
