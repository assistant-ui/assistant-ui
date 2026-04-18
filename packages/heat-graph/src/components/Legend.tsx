"use client";

import type { ReactNode } from "react";
import {
  LegendItemContext,
  type LegendItemData,
  useHeatGraphContext,
} from "../context";

export type LegendProps = {
  children: (props: { item: LegendItemData }) => ReactNode;
};

export const Legend = ({ children }: LegendProps) => {
  const { levels, colorScale } = useHeatGraphContext();
  return Array.from({ length: levels }, (_, i) => {
    const item: LegendItemData = { level: i, color: colorScale?.[i] };
    return (
      <LegendItemContext key={i} value={item}>
        {children({ item })}
      </LegendItemContext>
    );
  });
};
