import { describe, expect, it } from "vitest";
import { formatWhen, formatWhenLabel } from "./common";

describe("formatWhen", () => {
  const now = new Date("2026-06-17T15:00:00");

  it("shows time only for today", () => {
    const label = formatWhen("2026-06-17T10:36:04.000Z", now);
    expect(label).toMatch(/36/);
    expect(label).not.toMatch(/Jun/i);
  });

  it("shows yesterday prefix for previous day", () => {
    expect(formatWhen("2026-06-16T10:36:04.000Z", now)).toMatch(/^Yesterday /);
  });

  it("does not collapse to AM/PM only", () => {
    const label = formatWhen("2026-06-17T10:36:04.000Z", now);
    expect(label).not.toBe("AM");
    expect(label).not.toBe("PM");
  });
});

describe("formatWhenLabel", () => {
  it("returns a full datetime string", () => {
    const label = formatWhenLabel("2026-06-17T10:36:04.000Z");
    expect(label).toContain("2026");
    expect(label).toMatch(/36/);
  });
});
