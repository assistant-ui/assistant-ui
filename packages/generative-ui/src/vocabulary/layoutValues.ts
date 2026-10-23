import { readReserved } from "../constants";
import type { Action } from "../ir";

export const toCssLength = (value: string | number): string =>
  typeof value === "number" ? `${value}px` : value;

export const safeBackground = (value: unknown) =>
  typeof value === "string" &&
  !value.includes("\\") &&
  !/(?:url|src|image|image-set|-webkit-image-set|cross-fade|element|paint)\s*\(/i.test(
    value,
  )
    ? value
    : undefined;

export const footerAction = (
  button: Readonly<Record<string, unknown>> | undefined,
): Action | undefined =>
  button && (readReserved(button, "action") as Action | undefined);

export function boxStyle(
  width: string | number | undefined,
  height: string | number | undefined,
  radius: "full" | number | undefined,
  background: string | undefined,
) {
  const style: {
    width?: string;
    height?: string;
    background?: string;
    borderRadius?: string;
  } = {};
  if (width !== undefined) style.width = toCssLength(width);
  if (height !== undefined) style.height = toCssLength(height);
  const safe = safeBackground(background);
  if (safe !== undefined) style.background = safe;
  if (radius === "full") style.borderRadius = "9999px";
  else if (typeof radius === "number") style.borderRadius = `${radius}px`;
  return style;
}
