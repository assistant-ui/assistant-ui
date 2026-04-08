export function resolveValue(
  value: unknown,
  getData: (path: string) => unknown,
): unknown {
  if (value && typeof value === "object" && "path" in value) {
    return getData((value as { path: string }).path);
  }
  return value;
}
