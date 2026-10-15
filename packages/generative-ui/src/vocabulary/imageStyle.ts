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
