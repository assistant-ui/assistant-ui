"use client";

import { type ReactNode, useMemo } from "react";
import {
  LegendItemContext,
  type LegendItemData,
  useHeatGraphContext,
} from "../context";

export type LegendCollection = {
  map: (fn: (item: LegendItemData) => ReactNode) => ReactNode[];
};

export type LegendProps = {
  children: (props: { items: LegendCollection }) => ReactNode;
};

export const Legend = ({ children }: LegendProps) => {
  const { levels, colorScale } = useHeatGraphContext();
  const items = useMemo<LegendCollection>(
    () => ({
      map: (fn) =>
        Array.from({ length: levels }, (_, i) => {
          const item: LegendItemData = { level: i, color: colorScale?.[i] };
          return (
            <LegendItemContext key={i} value={item}>
              {fn(item)}
            </LegendItemContext>
          );
        }),
    }),
    [levels, colorScale],
  );
  return children({ items });
};
