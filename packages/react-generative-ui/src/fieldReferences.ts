const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const MAX_DEPTH = 64;

const isFieldReference = (
  value: unknown,
): value is { readonly $field: string } =>
  isRecord(value) &&
  Object.keys(value).length === 1 &&
  typeof value["$field"] === "string";

export const resolveFieldReferences = (
  value: unknown,
  fields: Readonly<Record<string, unknown>>,
): unknown => {
  const ancestors = new Set<object>();
  const resolve = (entry: unknown, depth: number): unknown => {
    if (isFieldReference(entry)) {
      return Object.hasOwn(fields, entry.$field)
        ? fields[entry.$field]
        : undefined;
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
