"use client";

import { createContext, useContext } from "react";

/**
 * The datum a hovered mark identifies. Charts stamp `data-i` and `data-series`
 * on every mark; the consumer owns the data those indices point into.
 */
export type MarkDatum = {
  index: number | undefined;
  series: string | undefined;
};

/** Hover state; x and y are container-relative pointer coordinates. */
export type TooltipState = {
  datum: MarkDatum | null;
  x: number;
  y: number;
};

// Dispatch context: stable setters, consumed by Root's delegation handlers
// (doesn't re-render on hover state changes).
export type TooltipDispatch = {
  onMarkMove: (datum: MarkDatum, x: number, y: number) => void;
  onMarkLeave: () => void;
};

export const TooltipDispatchContext = createContext<TooltipDispatch | null>(
  null,
);

export const useTooltipDispatch = () => useContext(TooltipDispatchContext);

// State context: changes on hover, consumed only by Tooltip.
export const TooltipStateContext = createContext<TooltipState | null>(null);

export const useTooltipState = () => useContext(TooltipStateContext);
