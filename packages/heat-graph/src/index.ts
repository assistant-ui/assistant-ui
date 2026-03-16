"use client";

export { Root, type RootProps } from "./components/Root";
export { MonthLabels, type MonthLabelsProps } from "./components/MonthLabels";
export { DayLabels, type DayLabelsProps } from "./components/DayLabels";
export { Grid, type GridProps } from "./components/Grid";
export { Cell, type CellProps } from "./components/Cell";
export { Legend, type LegendProps } from "./components/Legend";
export { LegendLevel, type LegendLevelProps } from "./components/LegendLevel";
export { Tooltip, type TooltipProps } from "./components/Tooltip";

export { autoLevels } from "./utils/classify";
export { MONTH_SHORT, DAY_SHORT } from "./utils/date-utils";

export type {
  DataPoint,
  ClassifyFn,
  CellData,
  MonthLabel,
  DayLabel,
  WeekStart,
  HeatGraphState,
} from "./types";
