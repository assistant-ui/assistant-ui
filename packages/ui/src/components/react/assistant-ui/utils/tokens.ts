/**
 * Token counts as the elements print them: `950`, `48.2k`, `912.5M`.
 */

const UNITS = [
  { size: 1_000, suffix: "k" },
  { size: 1_000_000, suffix: "M" },
  { size: 1_000_000_000, suffix: "B" },
  { size: 1_000_000_000_000, suffix: "T" },
] as const;

const tenths = (value: number) => Math.round(value * 10) / 10;

/**
 * `tokens` to one decimal in the first unit that keeps it under a thousand, so
 * `999_950` reads `1M` rather than `1000k`.
 */
export function formatTokenCount(tokens: number): string {
  if (!(tokens >= 1_000)) return `${tokens}`;
  let label = "";
  for (const { size, suffix } of UNITS) {
    const value = tenths(tokens / size);
    label = `${value}${suffix}`;
    if (value < 1_000) break;
  }
  return label;
}
