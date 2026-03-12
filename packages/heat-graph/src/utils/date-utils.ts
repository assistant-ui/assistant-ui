import type { WeekStart } from "../types";

export const normalizeDate = (d: string | Date): Date => {
  if (typeof d === "string") {
    // Parse YYYY-MM-DD as local date (not UTC)
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y!, m! - 1, day);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

export const startOfWeek = (date: Date, weekStart: WeekStart): Date => {
  const d = new Date(date);
  const dayIndex = getDayOfWeekIndex(d, weekStart);
  d.setDate(d.getDate() - dayIndex);
  return d;
};

export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

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
