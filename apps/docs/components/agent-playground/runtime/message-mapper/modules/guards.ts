export function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

export function stringAt(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) current = asRecord(current)[key];
  return typeof current === "string" ? current : null;
}
