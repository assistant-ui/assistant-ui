/**
 * Advance width of one character as a fraction of the font size. Chart text
 * inherits the host's face, so this is an estimate: digits and lowercase in a
 * proportional face sit near six tenths of an em, a monospace face exactly
 * there. The ellipsis absorbs the error. Measurement is not available: charts
 * render on the server.
 */
export const CHAR_RATIO = 0.6;

export function textWidth(text: string, fontSize: number): number {
  return Math.max(0, text.length) * fontSize * CHAR_RATIO;
}

/** How many characters of `text` fit in `width` at `fontSize`. */
export function charsThatFit(width: number, fontSize: number): number {
  if (!(width > 0) || !(fontSize > 0)) return 0;
  return Math.floor(width / (fontSize * CHAR_RATIO));
}

/**
 * `text` shortened to fit `width`, with a trailing ellipsis when it had to be
 * cut. A label that cannot fit even one character returns empty rather than
 * drawing a lone ellipsis, and nothing is ever drawn outside the box: silently
 * clipped text is the failure this exists to prevent.
 */
export function truncate(
  text: string,
  fontSize: number,
  width: number,
): string {
  const fits = charsThatFit(width, fontSize);
  if (fits >= text.length) return text;
  if (fits < 2) return "";
  return `${text.slice(0, fits - 1)}…`;
}
