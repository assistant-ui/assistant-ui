import { describe, expect, it } from "vitest";
import { computeGrid } from "../utils/grid";

describe("computeGrid", () => {
  it("generates cells for date range", () => {
    const result = computeGrid({
      data: [{ date: "2025-01-15", count: 5 }],
      start: "2025-01-13", // Monday
      end: "2025-01-19", // Sunday
      weekStart: "monday",
    });

    expect(result.cells).toHaveLength(7);
    expect(result.totalWeeks).toBe(1);
  });

  it("fills missing dates with count 0", () => {
    const result = computeGrid({
      data: [{ date: "2025-01-15", count: 5 }],
      start: "2025-01-13",
      end: "2025-01-19",
      weekStart: "monday",
    });

    const zeroCells = result.cells.filter((c) => c.count === 0);
    expect(zeroCells).toHaveLength(6);

    const nonZero = result.cells.find((c) => c.count === 5);
    expect(nonZero).toBeDefined();
    expect(nonZero!.date.getDate()).toBe(15);
  });

  it("computes correct column and row for monday start", () => {
    const result = computeGrid({
      data: [],
      start: "2025-01-13", // Monday
      end: "2025-01-19", // Sunday
      weekStart: "monday",
    });

    // Monday = row 0, Sunday = row 6
    expect(result.cells[0]!.row).toBe(0);
    expect(result.cells[6]!.row).toBe(6);
    expect(result.cells[0]!.column).toBe(0);
  });

  it("computes correct column and row for sunday start", () => {
    const result = computeGrid({
      data: [],
      start: "2025-01-12", // Sunday
      end: "2025-01-18", // Saturday
      weekStart: "sunday",
    });

    // Sunday = row 0, Saturday = row 6
    expect(result.cells[0]!.row).toBe(0);
    expect(result.cells[6]!.row).toBe(6);
  });

  it("generates month labels", () => {
    const result = computeGrid({
      data: [],
      start: "2025-01-01",
      end: "2025-03-31",
      weekStart: "sunday",
    });

    const months = result.monthLabels.map((l) => l.month);
    expect(months).toContain(0); // Jan
    expect(months).toContain(1); // Feb
    expect(months).toContain(2); // Mar
  });

  it("generates day labels for sunday start", () => {
    const result = computeGrid({
      data: [],
      start: "2025-01-01",
      end: "2025-01-07",
      weekStart: "sunday",
    });

    expect(result.dayLabels[0]!.dayOfWeek).toBe(0); // Sun
    expect(result.dayLabels[1]!.dayOfWeek).toBe(1); // Mon
    expect(result.dayLabels[6]!.dayOfWeek).toBe(6); // Sat
  });

  it("generates day labels for monday start", () => {
    const result = computeGrid({
      data: [],
      start: "2025-01-06",
      end: "2025-01-12",
      weekStart: "monday",
    });

    expect(result.dayLabels[0]!.dayOfWeek).toBe(1); // Mon
    expect(result.dayLabels[6]!.dayOfWeek).toBe(0); // Sun
  });

  it("aggregates duplicate dates", () => {
    const result = computeGrid({
      data: [
        { date: "2025-01-15", count: 3 },
        { date: "2025-01-15", count: 7 },
      ],
      start: "2025-01-13",
      end: "2025-01-19",
      weekStart: "monday",
    });

    const cell = result.cells.find((c) => c.date.getDate() === 15);
    expect(cell!.count).toBe(10);
  });

  it("defaults to 365 days ending today", () => {
    const result = computeGrid({ data: [] });
    const firstDate = result.cells[0]!.date;
    const lastDate = result.cells[result.cells.length - 1]!.date;

    const diffMs = lastDate.getTime() - firstDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    // Should be roughly a year (364 days + alignment to week start)
    expect(diffDays).toBeGreaterThanOrEqual(364);
    expect(diffDays).toBeLessThanOrEqual(371);
  });
});
