export function allowedImageSrc(
  src: string | undefined,
  imageOrigins: readonly string[] | undefined,
): boolean {
  if (imageOrigins === undefined) return true;
  if (typeof src !== "string") return false;
  if (/^data:image\//i.test(src)) return true;
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    return imageOrigins.includes(new URL(src).origin);
  } catch {
    return false;
  }
}

export function imageStyle(
  size: string | number | undefined,
  round: boolean | undefined,
) {
  const numericSize = typeof size === "number" ? size : undefined;
  const style =
    numericSize === undefined
      ? undefined
      : round
        ? { width: `${numericSize}px`, height: `${numericSize}px` }
        : { maxWidth: `${numericSize}px` };
  return { numericSize, style };
}
