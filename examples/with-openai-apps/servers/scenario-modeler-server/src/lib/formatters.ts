/**
 * Format a number as currency with abbreviated suffixes.
 * Examples: $50K, $1.2M, -$30K
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000) {
    const formatted = (absValue / 1_000_000).toFixed(
      absValue >= 10_000_000 ? 1 : 2,
    );
    // Remove trailing zeros after decimal
    const cleaned = formatted.replace(/\.?0+$/, "");
    return `${sign}$${cleaned}M`;
  }

  if (absValue >= 1_000) {
    const formatted = (absValue / 1_000).toFixed(absValue >= 100_000 ? 0 : 1);
    const cleaned = formatted.replace(/\.?0+$/, "");
    return `${sign}$${cleaned}K`;
  }

  return `${sign}$${Math.round(absValue)}`;
}

/**
 * Format a number as a percentage.
 * Examples: 5%, -2.5%, +12%
 */
export function formatPercent(value: number, showSign = false): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(/\.0$/, "")}%`;
}

/**
 * Format currency for slider display (always show K suffix for consistency).
 */
export function formatCurrencySlider(value: number): string {
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value}`;
}
