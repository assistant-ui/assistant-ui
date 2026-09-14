export const toTextContent = (value: unknown): string | number | null =>
  typeof value === "string" || typeof value === "number" ? value : null;
