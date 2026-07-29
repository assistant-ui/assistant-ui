export const httpUrlPattern = /^https?:\/\//i;

export function parseDataUrl(
  value: string,
): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([^;,]+)(?:;[^;,]+)*;base64,(.*)$/i);
  if (!match) return null;
  return { mimeType: match[1]!.toLowerCase(), data: match[2]! };
}
