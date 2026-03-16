export type DataPoint = {
  date: string | Date;
  count: number;
};

export type ClassifyFn = (counts: number[]) => (count: number) => number;

export type CellData = {
  date: Date;
  count: number;
  level: number;
  column: number;
  row: number;
};

export type MonthLabel = {
  month: number;
  column: number;
};

export type DayLabel = {
  dayOfWeek: number;
  row: number;
};

export type WeekStart = "sunday" | "monday";

export type HeatGraphState = {
  cells: CellData[];
  totalWeeks: number;
  monthLabels: MonthLabel[];
  dayLabels: DayLabel[];
  levels: number;
  colorScale?: string[] | undefined;
};
