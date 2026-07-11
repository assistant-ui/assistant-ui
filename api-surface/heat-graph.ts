import * as Popper from "@radix-ui/react-popper";

import { ComponentPropsWithoutRef, ReactNode } from "react";

declare const Cell: import("react").ForwardRefExoticComponent<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & {
  colorScale?: string[];
} & import("react").RefAttributes<HTMLDivElement>>;

type CellData = {
  date: Date;
  count: number;
  level: number;
  column: number;
  row: number;
};

type CellProps = ComponentPropsWithoutRef<"div"> & {
  colorScale?: string[];
};

type ClassifyFn = (counts: number[]) => (count: number) => number;

type ComputeGridOptions = {
  data: DataPoint[];
  start?: string | Date | undefined;
  end?: string | Date | undefined;
  weekStart?: WeekStart | undefined;
  classify?: ClassifyFn | undefined;
};

declare const DAY_SHORT: readonly [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat"
];

type DataPoint = {
  date: string | Date;
  count: number;
};

type DayLabel = {
  dayOfWeek: number;
  row: number;
};

declare const DayLabels: (_param0: DayLabelsProps) => import("react").JSX.Element[];

type DayLabelsProps = {
  children: (props: {
    label: DayLabel;
  }) => ReactNode;
};

declare const Grid: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref">, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;

type GridProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
};

type HeatGraphState = {
  cells: CellData[];
  totalWeeks: number;
  monthLabels: MonthLabel[];
  dayLabels: DayLabel[];
  levels: number;
  colorScale?: string[] | undefined;
};

declare const Legend: (_param1: LegendProps) => import("react").JSX.Element[];

type LegendItemData = {
  level: number;
  color: string | undefined;
};

declare const LegendLevel: import("react").ForwardRefExoticComponent<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

type LegendLevelProps = ComponentPropsWithoutRef<"div">;

type LegendProps = {
  children: (props: {
    item: LegendItemData;
  }) => ReactNode;
};

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

type MonthLabel = {
  month: number;
  column: number;
};

declare const MonthLabels: (_param2: MonthLabelsProps) => import("react").JSX.Element[];

type MonthLabelsProps = {
  children: (props: {
    label: MonthLabel;
    totalWeeks: number;
  }) => ReactNode;
};

type PopperContentProps = ComponentPropsWithoutRef<typeof Popper.Content>;

declare const Root: import("react").ForwardRefExoticComponent<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & ComputeGridOptions & {
  colorScale?: string[];
} & import("react").RefAttributes<HTMLDivElement>>;

type RootProps = ComponentPropsWithoutRef<"div"> & ComputeGridOptions & {
  colorScale?: string[];
};

declare const Tooltip: import("react").ForwardRefExoticComponent<Omit<Omit<Popper.PopperContentProps & import("react").RefAttributes<HTMLDivElement>, "ref">, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;

type TooltipProps = Omit<PopperContentProps, "children"> & {
  children: (props: {
    cell: CellData;
  }) => ReactNode;
};

type WeekStart = "monday" | "sunday";

declare const autoLevels: (n: number) => ClassifyFn;

declare namespace entry_root_exports {
  export { Cell, CellData, CellProps, ClassifyFn, DAY_SHORT, DataPoint, DayLabel, DayLabels, DayLabelsProps, Grid, GridProps, HeatGraphState, Legend, LegendLevel, LegendLevelProps, LegendProps, MONTH_SHORT, MonthLabel, MonthLabels, MonthLabelsProps, Root, RootProps, Tooltip, TooltipProps, WeekStart, autoLevels };
}

export { entry_root_exports as entry_root };
