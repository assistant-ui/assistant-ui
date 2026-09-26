type TableFormat = {
  kind: "number" | "currency" | "percent" | "date";
  currency?: string;
  decimals?: number;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const toRawText = (value: unknown): string =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value)
    : "";

const isTableFormat = (format: unknown): format is TableFormat =>
  format !== null &&
  typeof format === "object" &&
  "kind" in format &&
  (format.kind === "number" ||
    format.kind === "currency" ||
    format.kind === "percent" ||
    format.kind === "date");

const fractionDigits = (decimals: unknown): number | undefined => {
  if (typeof decimals !== "number" || !Number.isFinite(decimals)) {
    return undefined;
  }
  return Math.min(20, Math.max(0, Math.trunc(decimals)));
};

const dateFromValue = (value: unknown): Date | undefined => {
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const isNumericTableFormat = (format: unknown): boolean =>
  isTableFormat(format) && format.kind !== "date";

export const formatValue = (value: unknown, format: unknown): string => {
  const raw = toRawText(value);
  try {
    if (!isTableFormat(format)) return raw;

    if (format.kind === "date") {
      const date = dateFromValue(value);
      return date === undefined
        ? raw
        : new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            ...(typeof value === "string" && DATE_ONLY_PATTERN.test(value)
              ? { timeZone: "UTC" }
              : {}),
          }).format(date);
    }

    if (typeof value !== "number") return raw;

    const decimals = fractionDigits(format.decimals);
    const digitOptions =
      decimals === undefined
        ? {}
        : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
    if (format.kind === "currency") {
      if (typeof format.currency !== "string") return raw;
      return new Intl.NumberFormat("en-US", {
        ...digitOptions,
        style: "currency",
        currency: format.currency,
      }).format(value);
    }
    return new Intl.NumberFormat("en-US", {
      ...digitOptions,
      ...(format.kind === "percent" ? { style: "percent" } : {}),
    }).format(value);
  } catch {
    return raw;
  }
};
