export const toTextContent = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : null;
