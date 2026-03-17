"use client";

import { createContext, useContext } from "react";
import type { CellData, HeatGraphState } from "./types";

export const HeatGraphContext = createContext<HeatGraphState | null>(null);

export const useHeatGraphContext = (): HeatGraphState => {
  const ctx = useContext(HeatGraphContext);
  if (!ctx) {
    throw new Error("useHeatGraphContext must be used within a HeatGraph.Root");
  }
  return ctx;
};

export type TooltipState = {
  hoveredCell: CellData | null;
  anchor: HTMLElement | null;
};

// Dispatch context: stable setters, consumed by Grid (doesn't re-render on state change)
export type TooltipDispatch = {
  onCellEnter: (cell: CellData, element: HTMLElement) => void;
  onCellLeave: () => void;
};

export const TooltipDispatchContext = createContext<TooltipDispatch | null>(
  null,
);

export const useTooltipDispatch = () => useContext(TooltipDispatchContext);

// State context: changes on hover, consumed only by Tooltip
export const TooltipStateContext = createContext<TooltipState | null>(null);

export const useTooltipState = () => useContext(TooltipStateContext);

// Legend item context: set by Legend per level
export type LegendItemData = {
  level: number;
  color: string | undefined;
};

export const LegendItemContext = createContext<LegendItemData | null>(null);

export const useLegendItemContext = (): LegendItemData => {
  const ctx = useContext(LegendItemContext);
  if (!ctx) {
    throw new Error(
      "useLegendItemContext must be used within a HeatGraph.Legend",
    );
  }
  return ctx;
};

// Cell context: set by Grid per cell
export const CellContext = createContext<CellData | null>(null);

export const useCellContext = (): CellData => {
  const ctx = useContext(CellContext);
  if (!ctx) {
    throw new Error("useCellContext must be used within a HeatGraph.Grid");
  }
  return ctx;
};
