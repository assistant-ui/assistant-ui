/**
 * Sort an array of objects by a key
 */
export function sortData<T, K extends Extract<keyof T, string>>(
  data: T[],
  key: K,
  direction: "asc" | "desc",
  locale?: string,
): T[] {
  const get = (obj: T, k: K): unknown => (obj as Record<string, unknown>)[k];
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: "base",
  });
  return [...data].sort((a, b) => {
    const aVal = get(a, key);
    const bVal = get(b, key);

    // Handle nulls
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Type-specific comparison
    // Numbers
    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }
    // Dates (Date instances)
    if (aVal instanceof Date && bVal instanceof Date) {
      const diff = aVal.getTime() - bVal.getTime();
      return direction === "asc" ? diff : -diff;
    }
    // Booleans: false < true
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      const diff = aVal === bVal ? 0 : aVal ? 1 : -1;
      return direction === "asc" ? diff : -diff;
    }
    // Arrays: compare length
    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      const diff = aVal.length - bVal.length;
      return direction === "asc" ? diff : -diff;
    }
    // Strings that look like numbers -> numeric compare
    if (typeof aVal === "string" && typeof bVal === "string") {
      const numA = parseNumericLike(aVal);
      const numB = parseNumericLike(bVal);
      if (numA != null && numB != null) {
        const diff = numA - numB;
        return direction === "asc" ? diff : -diff;
      }
      // ISO-like date strings
      if (/^\d{4}-\d{2}-\d{2}/.test(aVal) && /^\d{4}-\d{2}-\d{2}/.test(bVal)) {
        const da = new Date(aVal).getTime();
        const db = new Date(bVal).getTime();
        const diff = da - db;
        return direction === "asc" ? diff : -diff;
      }
    }

    // Fallback: locale-aware string compare with numeric collation
    const aStr = String(aVal);
    const bStr = String(bVal);
    const comparison = collator.compare(aStr, bStr);
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Return a human-friendly identifier for a row using common keys
 *
 * Accepts any JSON-serializable primitive or array of primitives.
 * Arrays are converted to comma-separated strings.
 */
export function getRowIdentifier(
  row: Record<
    string,
    string | number | boolean | null | (string | number | boolean | null)[]
  >,
  identifierKey?: string,
): string {
  const candidate =
    (identifierKey ? row[identifierKey] : undefined) ??
    (row as Record<string, unknown>)["name"] ??
    (row as Record<string, unknown>)["title"] ??
    (row as Record<string, unknown>)["id"];

  if (candidate == null) {
    return "";
  }

  // Handle arrays by joining them
  if (Array.isArray(candidate)) {
    return candidate.map((v) => (v === null ? "null" : String(v))).join(", ");
  }

  return String(candidate).trim();
}

/**
 * Parse a string that represents a numeric value, handling various formats:
 * - Currency symbols: $, etc.
 * - Percent symbols: %
 * - Accounting negatives: (1234) -> -1234
 * - Thousands/decimal separators: 1,234.56 or 1.234,56
 * - Compact notation: 2.8T (trillion), 1.5M (million), 500K (thousand)
 * - Byte suffixes: 768B (bytes), 1.5KB, 2GB, 1TB
 *
 * Note: Single "B" is disambiguated - integers < 1024 are bytes, otherwise billions.
 *
 * @param input - String to parse
 * @returns Parsed number or null if unparseable
 *
 * @example
 * parseNumericLike("$1,234.56") // 1234.56
 * parseNumericLike("2.8T") // 2800000000000
 * parseNumericLike("768B") // 768
 * parseNumericLike("50%") // 50
 * parseNumericLike("(1234)") // -1234
 */
export function parseNumericLike(input: string): number | null {
  // Normalize whitespace (spaces, NBSPs, thin spaces)
  let s = input.replace(/[\u00A0\u202F\s]/g, "").trim();
  if (!s) return null;

  // Accounting negatives: (1234) -> -1234
  s = s.replace(/^\((.*)\)$/g, "-$1");

  // Strip common currency and percent symbols
  s = s.replace(/[%$\u20AC\xA3\xA5\u20A9\u20B9\u20BD\u20BA\u20AA\u20AB\u0E3F\u20A6\u20B4\u20A1\u20B2\u20B5\u20B8]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    // Decide decimal by whichever occurs last
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    s = s.split(thousandSep).join("");
    s = s.replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    // Only comma present
    const frac = s.length - lastComma - 1;
    if (frac === 2 || frac === 3) s = s.replace(/,/g, ".");
    else s = s.replace(/,/g, "");
  } else if (lastDot !== -1) {
    // Only dot present; if multiple dots, treat as thousands and strip
    if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  }

  // Handle compact notation (K, M, B, T, P, G) and byte suffixes (KB, MB, GB, TB, PB)
  const compactMatch = s.match(/^([+-]?\d+\.?\d*|\d*\.\d+)([KMBTPG]B?|B)$/i);
  if (compactMatch) {
    const numPart = compactMatch[1];
    const suffixPart = compactMatch[2];
    if (!numPart || !suffixPart) return null;

    const baseNum = Number(numPart);
    if (Number.isNaN(baseNum)) return null;

    const suffix = suffixPart.toUpperCase();

    // Disambiguate single "B" (bytes vs billions)
    // If whole number < 1024, treat as bytes. Otherwise, billions.
    if (suffix === "B") {
      const isLikelyBytes = Number.isInteger(baseNum) && baseNum < 1024;
      return isLikelyBytes ? baseNum : baseNum * 1e9;
    }

    const multipliers: Record<string, number> = {
      K: 1e3,
      KB: 1024, // Kilo: metric vs binary
      M: 1e6,
      MB: 1024 ** 2, // Mega
      G: 1e9,
      GB: 1024 ** 3, // Giga
      T: 1e12,
      TB: 1024 ** 4, // Tera
      P: 1e15,
      PB: 1024 ** 5, // Peta
    };

    const multiplier = multipliers[suffix];
    return baseNum * (multiplier !== undefined ? multiplier : 1);
  }

  if (/^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/.test(s)) {
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
