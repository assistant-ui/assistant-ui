export const DEFAULT_EXTERNAL_SCHEMES: readonly string[] = [
  "http:",
  "https:",
  "mailto:",
];

export const parseExternalUrl = (
  value: unknown,
  schemes: readonly string[],
): string | null => {
  if (typeof value !== "string" && !(value instanceof URL)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return schemes.includes(url.protocol) ? url.href : null;
};
