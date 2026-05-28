export function resolveValue(
  value: unknown,
  getData: (path: string) => unknown,
): unknown {
  if (value && typeof value === "object" && "path" in value) {
    const path = (value as { path: unknown }).path;
    if (typeof path !== "string") return value;
    return getData(path);
  }
  return value;
}
