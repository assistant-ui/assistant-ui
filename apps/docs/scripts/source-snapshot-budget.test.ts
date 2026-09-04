import {
  SNAPSHOT_BYTE_BUDGET,
  formatBudgetError,
  formatBytes,
} from "./source-snapshot-budget.mts";

describe("formatBytes", () => {
  it("switches to megabytes at a megabyte", () => {
    expect(formatBytes(999_999)).toBe("1000 KB");
    expect(formatBytes(1_000_000)).toBe("1.0 MB");
    expect(formatBytes(27_123_049)).toBe("27.1 MB");
  });
});

describe("formatBudgetError", () => {
  const snapshot = (entries: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(entries).map(([name, size]) => [name, "x".repeat(size)]),
    );

  it("reports the overage, the file count, and the budget", () => {
    const report = formatBudgetError(
      snapshot({ "a.ts": 2_000_000, "b.ts": 1_000 }),
      70_000_000,
    );

    expect(report).toContain("Source snapshot is 70.0 MB across 2 files");
    expect(report).toContain(`over the ${formatBytes(SNAPSHOT_BYTE_BUDGET)}`);
    expect(report).toContain("SOURCE_SNAPSHOT_EXCLUDE");
  });

  it("lists the largest entries first", () => {
    const report = formatBudgetError(
      snapshot({ "small.ts": 1_000, "huge.ts": 900_000, "mid.ts": 20_000 }),
      70_000_000,
    );
    const listed = report
      .slice(report.indexOf("Largest entries:"))
      .split("\n")
      .slice(1);

    expect(listed).toEqual([
      "     900 KB  huge.ts",
      "      20 KB  mid.ts",
      "       1 KB  small.ts",
    ]);
  });

  it("caps the list so a repo-wide overage stays readable", () => {
    const entries = Object.fromEntries(
      Array.from({ length: 40 }, (_, index) => [`file-${index}.ts`, 1_000]),
    );
    const report = formatBudgetError(snapshot(entries), 70_000_000);

    expect(report.split("Largest entries:\n")[1]!.split("\n")).toHaveLength(15);
  });

  it("measures utf-8 bytes rather than string length", () => {
    const report = formatBudgetError(
      { "ascii.ts": "x".repeat(3_000), "emoji.ts": "🙂".repeat(1_000) },
      70_000_000,
    );
    const listed = report
      .slice(report.indexOf("Largest entries:"))
      .split("\n")
      .slice(1);

    expect(listed[0]).toBe("       4 KB  emoji.ts");
    expect(listed[1]).toBe("       3 KB  ascii.ts");
  });
});
