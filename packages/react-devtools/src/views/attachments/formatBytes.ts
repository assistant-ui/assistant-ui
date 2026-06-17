export const formatBytes = (bytes: number | undefined): string | undefined => {
  if (bytes === undefined || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Rough size from base64 payload (no decoding). */
export const estimateBase64Bytes = (data: string): number =>
  Math.max(0, Math.floor((data.length * 3) / 4));

export const isSafeImagePreviewUrl = (url: string): boolean =>
  url.startsWith("data:image/") ||
  url.startsWith("https://") ||
  url.startsWith("http://");
