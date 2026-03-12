"use client";

import type { ReactNode } from "react";
import { useHeatGraphContext } from "../context";
import type { DayLabel } from "../types";

export type DayLabelsProps = {
  children: (props: { labels: DayLabel[] }) => ReactNode;
};

export const DayLabels = ({ children }: DayLabelsProps) => {
  const { dayLabels } = useHeatGraphContext();
  return children({ labels: dayLabels });
};
