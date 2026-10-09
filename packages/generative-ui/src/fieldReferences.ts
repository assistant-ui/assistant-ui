const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const MAX_DEPTH = 64;

const isFieldReference = (
  value: unknown,
): value is { readonly $field: string; readonly fallback?: unknown } =>
  isRecord(value) &&
  typeof value["$field"] === "string" &&
  Object.keys(value).every((key) => key === "$field" || key === "fallback");

/**
 * Whether `value` contains a `{ "$field": name }` or `{ "$field": name, "fallback": value }` reference within 64 levels.
 */
export const hasFieldReference = (value: unknown): boolean => {
  const seen = new Set<object>();
  const visit = (entry: unknown, depth: number): boolean => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      depth > MAX_DEPTH ||
      seen.has(entry)
    ) {
      return false;
    }
    if (isFieldReference(entry)) return true;
    seen.add(entry);
    return Object.values(entry).some((item) => visit(item, depth + 1));
  };
  return visit(value, 0);
};

/**
 * Replaces each `{ "$field": name }` reference inside `value` with the own property `name` of `fields`, or with the reference's own `fallback` when that is `undefined`. A reference that still resolves to `undefined` is dropped from its object or array, and a cyclic reference or anything nested deeper than 64 levels is kept as is.
 */
export const resolveFieldReferences = (
  value: unknown,
  fields: Readonly<Record<string, unknown>>,
): unknown => {
  const ancestors = new Set<object>();
  const resolve = (entry: unknown, depth: number): unknown => {
    if (isFieldReference(entry)) {
      const current = Object.hasOwn(fields, entry.$field)
        ? fields[entry.$field]
        : undefined;
      if (current !== undefined) return current;
      return Object.hasOwn(entry, "fallback") ? entry.fallback : undefined;
    }
    if (
      typeof entry !== "object" ||
      entry === null ||
      depth > MAX_DEPTH ||
      ancestors.has(entry)
    ) {
      return entry;
    }
    ancestors.add(entry);
    try {
      if (Array.isArray(entry)) {
        return entry
          .map((item) => resolve(item, depth + 1))
          .filter((item) => item !== undefined);
      }
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(entry)) {
        const resolved = resolve(item, depth + 1);
        if (resolved !== undefined) {
          Object.defineProperty(result, key, {
            value: resolved,
            enumerable: true,
            configurable: true,
            writable: true,
          });
        }
      }
      return result;
    } finally {
      ancestors.delete(entry);
    }
  };
  return resolve(value, 0);
};
