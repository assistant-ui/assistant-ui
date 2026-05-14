"use client";

import { Fragment, type ReactNode } from "react";
import { useHeatGraphContext } from "../context";
import type { MonthLabel } from "../types";

export type MonthLabelsProps = {
  children: (props: { label: MonthLabel; totalWeeks: number }) => ReactNode;
};

export const MonthLabels = ({ children }: MonthLabelsProps) => {
  const { monthLabels, totalWeeks } = useHeatGraphContext();
  return monthLabels.map((label) => (
    <Fragment key={`${label.month}-${label.column}`}>
      {children({ label, totalWeeks })}
    </Fragment>
  ));
};
