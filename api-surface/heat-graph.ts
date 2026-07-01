import { ComponentPropsWithoutRef, ReactNode } from "react";

import * as Popper from "@radix-ui/react-popper";

type CellProps = ComponentPropsWithoutRef<"div"> & {
  colorScale?: string[];
};

declare const Cell: import("react").ForwardRefExoticComponent<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & {
  colorScale?: string[];
} & import("react").RefAttributes<HTMLDivElement>>;

type DataPoint = {
  date: string | Date;
  count: number;
};

type ClassifyFn = (counts: number[]) => (count: number) => number;

type CellData = {
  date: Date;
  count: number;
  level: number;
  column: number;
  row: number;
};

type MonthLabel = {
  month: number;
  column: number;
};

type DayLabel = {
  dayOfWeek: number;
  row: number;
};

type WeekStart = "monday" | "sunday";

type HeatGraphState = {
  cells: CellData[];
  totalWeeks: number;
  monthLabels: MonthLabel[];
  dayLabels: DayLabel[];
  levels: number;
  colorScale?: string[] | undefined;
};

type DayLabelsProps = {
  children: (props: {
    label: DayLabel;
  }) => ReactNode;
};

declare const DayLabels: (_param0: DayLabelsProps) => import("react").JSX.Element[];

type GridProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
};

declare const Grid: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref">, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;

type LegendItemData = {
  level: number;
  color: string | undefined;
};

type LegendProps = {
  children: (props: {
    item: LegendItemData;
  }) => ReactNode;
};

declare const Legend: (_param1: LegendProps) => import("react").JSX.Element[];

type LegendLevelProps = ComponentPropsWithoutRef<"div">;

declare const LegendLevel: import("react").ForwardRefExoticComponent<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

type MonthLabelsProps = {
  children: (props: {
    label: MonthLabel;
    totalWeeks: number;
  }) => ReactNode;
};

declare const MonthLabels: (_param2: MonthLabelsProps) => import("react").JSX.Element[];

type ComputeGridOptions = {
  data: DataPoint[];
  start?: string | Date | undefined;
  end?: string | Date | undefined;
  weekStart?: WeekStart | undefined;
  classify?: ClassifyFn | undefined;
};

type RootProps = ComponentPropsWithoutRef<"div"> & ComputeGridOptions & {
  colorScale?: string[];
};

declare const Root: import("react").ForwardRefExoticComponent<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & ComputeGridOptions & {
  colorScale?: string[];
} & import("react").RefAttributes<HTMLDivElement>>;

type PopperContentProps = ComponentPropsWithoutRef<typeof Popper.Content>;

type TooltipProps = Omit<PopperContentProps, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
};

declare const Tooltip: import("react").ForwardRefExoticComponent<Omit<Omit<Popper.PopperContentProps & import("react").RefAttributes<HTMLDivElement>, "ref">, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;

declare const autoLevels: (n: number) => ClassifyFn;

declare const MONTH_SHORT: readonly [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

declare const DAY_SHORT: readonly [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat"
];

declare namespace entry_root_exports {
  export { Cell, CellData, CellProps, ClassifyFn, DAY_SHORT, DataPoint, DayLabel, DayLabels, DayLabelsProps, Grid, GridProps, HeatGraphState, Legend, LegendLevel, LegendLevelProps, LegendProps, MONTH_SHORT, MonthLabel, MonthLabels, MonthLabelsProps, Root, RootProps, Tooltip, TooltipProps, WeekStart, autoLevels };
}

export { entry_root_exports as entry_root };
