import type { WeekStart } from "../types";

export const normalizeDate = (d: string | Date): Date => {
  // Date-only strings are local calendar days; timestamps are instants
  // projected onto their local calendar day.
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y!, m! - 1, day);
  }

  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const dateToKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const WEEK_START_OFFSET: Record<WeekStart, number> = {
  sunday: 0,
  monday: 1,
};

export const getDayOfWeekIndex = (date: Date, weekStart: WeekStart): number => {
  const day = date.getDay();
  const offset = WEEK_START_OFFSET[weekStart];
  return (day - offset + 7) % 7;
};

export const startOfWeek = (date: Date, weekStart: WeekStart): Date =>
  addDays(date, -getDayOfWeekIndex(date, weekStart));

// Every date here stands for a local calendar day at midnight. `setDate` would
// carry the time-of-day forward, and where a DST transition happens at 00:00
// that midnight does not exist, so the constructor lands on 01:00 and every
// later step keeps the offset — enough for an instant comparison against a
// midnight endpoint to end the range a day early. Rebuilding from the calendar
// fields restores midnight on each step.
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const MONTH_SHORT = [
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
  "Dec",
] as const;

export const DAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const DAY_INDICES_SUNDAY = [0, 1, 2, 3, 4, 5, 6] as const;
const DAY_INDICES_MONDAY = [1, 2, 3, 4, 5, 6, 0] as const;

export const getDayOfWeekIndices = (weekStart: WeekStart): readonly number[] =>
  weekStart === "monday" ? DAY_INDICES_MONDAY : DAY_INDICES_SUNDAY;
