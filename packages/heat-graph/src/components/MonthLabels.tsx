"use client";

import type { ReactNode } from "react";
import { useHeatGraphContext } from "../context";
import type { MonthLabel } from "../types";

export type MonthLabelsProps = {
  children: (props: { labels: MonthLabel[]; totalWeeks: number }) => ReactNode;
};

export const MonthLabels = ({ children }: MonthLabelsProps) => {
  const { monthLabels, totalWeeks } = useHeatGraphContext();
  return children({ labels: monthLabels, totalWeeks });
};
