// Measured single-flight: one materialized repo sandbox costs roughly 14x the snapshot's byte size in resident memory. Sandboxes are built per request, so concurrent repo-tool calls multiply that term.
export const SNAPSHOT_BYTE_BUDGET = 64_000_000;

const BUDGET_REPORT_ENTRIES = 15;

export function formatBytes(bytes: number) {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.round(bytes / 1_000)} KB`;
}

export function formatBudgetError(
  snapshot: Record<string, string>,
  size: number,
) {
  const largest = Object.entries(snapshot)
    .map(([filePath, contents]) => ({
      filePath,
      bytes: Buffer.byteLength(contents, "utf-8"),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, BUDGET_REPORT_ENTRIES)
    .map(
      ({ filePath, bytes }) =>
        `  ${formatBytes(bytes).padStart(9)}  ${filePath}`,
    )
    .join("\n");

  return [
    `Source snapshot is ${formatBytes(size)} across ${Object.keys(snapshot).length} files, over the ${formatBytes(SNAPSHOT_BYTE_BUDGET)} budget.`,
    "",
    "Prefer excluding files the docs assistant does not need to read, by adding a SOURCE_SNAPSHOT_EXCLUDE pattern in generate-source-snapshot.mts, over raising the budget.",
    "",
    "Largest entries:",
    largest,
  ].join("\n");
}
