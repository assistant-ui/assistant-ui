import { readReserved } from "../constants";
import type { Action } from "../ir";

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const UNIT = String.raw`(?:%|[a-z]{1,5})?`;
const LENGTH = new RegExp(`^${NUMBER}${UNIT}$`, "i");
const KEYWORD = /^(?:auto|fit-content|min-content|max-content|stretch)$/i;
const RESOURCE =
  /(?:url|src|image|image-set|-webkit-image-set|cross-fade|element|paint)\s*\(/i;
const MATH = /^(?:calc|min|max|clamp)\([0-9a-z%.+\-*/ ,()]*\)$/i;

/**
 * A CSS length, or undefined. Only a number with an optional unit, a sizing
 * keyword, or a `calc`/`min`/`max`/`clamp` of those passes, so a value can't
 * close the declaration and start another when the style is rendered to a
 * string on the server.
 */
export const toCssLength = (value: unknown): string | undefined => {
  if (typeof value === "number")
    return Number.isFinite(value) ? `${value}px` : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return LENGTH.test(trimmed) ||
    KEYWORD.test(trimmed) ||
    (MATH.test(trimmed) && !RESOURCE.test(trimmed))
    ? trimmed
    : undefined;
};

export const safeBackground = (value: unknown) =>
  typeof value === "string" && !/[\\;{}]/.test(value) && !RESOURCE.test(value)
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
  const cssWidth = toCssLength(width);
  if (cssWidth !== undefined) style.width = cssWidth;
  const cssHeight = toCssLength(height);
  if (cssHeight !== undefined) style.height = cssHeight;
  const safe = safeBackground(background);
  if (safe !== undefined) style.background = safe;
  if (radius === "full") style.borderRadius = "9999px";
  else if (typeof radius === "number") style.borderRadius = `${radius}px`;
  return style;
}
