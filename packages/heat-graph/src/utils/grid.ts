import type {
  CellData,
  ClassifyFn,
  DataPoint,
  HeatGraphState,
  MonthLabel,
  WeekStart,
} from "../types";
import { autoLevels } from "./classify";
import {
  addDays,
  dateToKey,
  getDayOfWeekIndex,
  getDayOfWeekIndices,
  normalizeDate,
  startOfWeek,
} from "./date-utils";

export type ComputeGridOptions = {
  data: DataPoint[];
  start?: string | Date | undefined;
  end?: string | Date | undefined;
  weekStart?: WeekStart | undefined;
  classify?: ClassifyFn | undefined;
};

const DEFAULT_CLASSIFY = autoLevels(5);

export const computeGrid = (options: ComputeGridOptions): HeatGraphState => {
  const { data, weekStart = "sunday", classify = DEFAULT_CLASSIFY } = options;

  // Determine date range
  const end = options.end
    ? normalizeDate(options.end)
    : normalizeDate(new Date());
  const start = options.start
    ? normalizeDate(options.start)
    : addDays(end, -364);

  // Align start to beginning of its week
  const gridStart = startOfWeek(start, weekStart);

  // Build lookup map from data
  const countMap = new Map<string, number>();
  for (const point of data) {
    const key = dateToKey(normalizeDate(point.date));
    countMap.set(key, (countMap.get(key) ?? 0) + point.count);
  }

  // First pass: collect counts for classify
  const rawCounts: number[] = [];
  let current = gridStart;
  while (current <= end) {
    rawCounts.push(countMap.get(dateToKey(current)) ?? 0);
    current = addDays(current, 1);
  }

  // Classify once
  const classifyCount = classify(rawCounts);

  // Second pass: build cells with levels, month labels inline
  const cells: CellData[] = [];
  const monthLabels: MonthLabel[] = [];
  current = gridStart;
  let maxLevel = 0;
  let lastMonth = -1;

  for (let i = 0; i < rawCounts.length; i++) {
    const count = rawCounts[i]!;
    const level = classifyCount(count);
    if (level > maxLevel) maxLevel = level;

    const row = getDayOfWeekIndex(current, weekStart);
    const column = Math.floor(i / 7);

    cells.push({ date: current, count, level, column, row });

    // Track month boundaries (row 0 = first day of each week)
    if (row === 0) {
      const month = current.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ month, column });
        lastMonth = month;
      }
    }

    current = addDays(current, 1);
  }

  // Compute total weeks
  const totalWeeks = cells.length > 0 ? cells[cells.length - 1]!.column + 1 : 0;

  // Compute day labels
  const dayLabels = getDayOfWeekIndices(weekStart).map((dayOfWeek, row) => ({
    dayOfWeek,
    row,
  }));

  return {
    cells,
    totalWeeks,
    monthLabels,
    dayLabels,
    levels: maxLevel + 1,
  };
};
