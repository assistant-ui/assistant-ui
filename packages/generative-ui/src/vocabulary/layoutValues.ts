import { readReserved } from "../constants";
import type { Action } from "../ir";

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const UNITS =
  "px|%|em|rem|ex|ch|lh|rlh|vw|vh|vi|vb|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cqw|cqh|cqi|cqb|cqmin|cqmax|cm|mm|q|in|pt|pc";
const BARE = new RegExp(`^${NUMBER}$`, "i");
const LENGTH = new RegExp(`^${NUMBER}(?:${UNITS})$`, "i");
const KEYWORD = /^(?:auto|fit-content|min-content|max-content|stretch)$/i;
const RESOURCE =
  /(?:url|src|image|image-set|-webkit-image-set|cross-fade|element|paint)\s*\(/i;
const MATH = /^(?:calc|min|max|clamp)\(.*\)$/i;
const MATH_TOKEN = new RegExp(
  `(?:calc|min|max|clamp)\\(|${NUMBER}(?:${UNITS})?`,
  "gi",
);

/** True for a `calc`/`min`/`max`/`clamp` built only from lengths, numbers and operators. */
const HAS_LENGTH = new RegExp(`\\d(?:${UNITS})(?![a-z])`, "i");
/**
 * True when every parenthesis closes and no comment opens. A server-rendered
 * style is one string, so an open `(` or `/*` would swallow the declarations
 * that follow it.
 */
const isSelfContained = (value: string) => {
  if (value.includes("/*")) return false;
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth++;
    else if (char === ")" && --depth < 0) return false;
  }
  return depth === 0;
};

const isMath = (value: string) =>
  MATH.test(value) &&
  isSelfContained(value) &&
  HAS_LENGTH.test(value) &&
  /^[\s()+\-*/,]*$/.test(value.replace(MATH_TOKEN, ""));

/**
 * A CSS length, or undefined. Only a number with a unit, a sizing keyword,
 * or a `calc`/`min`/`max`/`clamp` of lengths passes, so a value can't close
 * the declaration and start another when the style is rendered to a string
 * on the server. A bare number, as a number or a string, is pixels.
 */
export const toCssLength = (value: unknown): string | undefined => {
  if (typeof value === "number")
    return Number.isFinite(value) ? `${value}px` : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (BARE.test(trimmed)) {
    const number = Number(trimmed);
    return Number.isFinite(number) ? `${number}px` : undefined;
  }
  return LENGTH.test(trimmed) || KEYWORD.test(trimmed) || isMath(trimmed)
    ? trimmed
    : undefined;
};

export const safeBackground = (value: unknown) =>
  typeof value === "string" &&
  !/[\\;{}'"[\]]/.test(value) &&
  !RESOURCE.test(value) &&
  isSelfContained(value)
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
