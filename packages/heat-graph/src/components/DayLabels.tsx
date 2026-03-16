"use client";

import { Fragment, type ReactNode } from "react";
import { useHeatGraphContext } from "../context";
import type { DayLabel } from "../types";

export type DayLabelsProps = {
  children: (props: { label: DayLabel }) => ReactNode;
};

export const DayLabels = ({ children }: DayLabelsProps) => {
  const { dayLabels } = useHeatGraphContext();
  return dayLabels.map((label) => (
    <Fragment key={label.row}>{children({ label })}</Fragment>
  ));
};
