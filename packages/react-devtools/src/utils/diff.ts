export interface DiffEntry {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Structural diff of two JSON-safe values by dotted path. Objects recurse
 * key-by-key; arrays and primitives are compared as whole leaves. Used for the
 * opt-in event payload diff, where most payloads are shallow.
 */
export const diffValues = (
  before: unknown,
  after: unknown,
  base = "",
): DiffEntry[] => {
  if (isPlainObject(before) && isPlainObject(after)) {
    const entries: DiffEntry[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const path = base ? `${base}.${key}` : key;
      const hasBefore = key in before;
      const hasAfter = key in after;
      if (hasBefore && !hasAfter) {
        entries.push({ path, kind: "removed", before: before[key] });
      } else if (!hasBefore && hasAfter) {
        entries.push({ path, kind: "added", after: after[key] });
      } else {
        entries.push(...diffValues(before[key], after[key], path));
      }
    }
    return entries;
  }

  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  return [{ path: base || "(value)", kind: "changed", before, after }];
};
