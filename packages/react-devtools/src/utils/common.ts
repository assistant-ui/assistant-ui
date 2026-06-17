export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const asBool = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const isStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const formatBoolean = (value: boolean | undefined) =>
  typeof value === "boolean" ? String(value) : undefined;

const toDate = (value: string | Date | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Full date + time for detail views and tooltips. */
export const formatDateTime = (value: string | Date | undefined) => {
  const date = toDate(value);
  if (!date) return typeof value === "string" ? value : undefined;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

/** Full label for `title` attributes. */
export const formatWhenLabel = (value: string | Date | undefined) => {
  const date = toDate(value);
  if (!date) return undefined;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
};

/**
 * Contextual timestamp for narrow rails: time-only today, short date + time
 * otherwise. Avoids locale strings that break when split on spaces.
 */
export const formatWhen = (
  value: string | Date | undefined,
  now: Date = new Date(),
) => {
  const date = toDate(value);
  if (!date) return typeof value === "string" ? value : undefined;

  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) return time;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${time}`;
  }

  const datePart =
    date.getFullYear() === now.getFullYear()
      ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

  return `${datePart} ${time}`;
};

export const truncate = (value: string, max = 120) =>
  value.length > max ? `${value.slice(0, max)}...` : value;

export const formatClockTime = (value: Date) =>
  `${value.getHours().toString().padStart(2, "0")}:${value
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${value.getSeconds().toString().padStart(2, "0")}.${value
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;

export const eventScope = (event: string) => event.split(".")[0] ?? event;

/** Compact duration: seconds with two decimals at or above 1s, whole ms below. */
export const formatMs = (value: number) => {
  const ms = Math.max(0, value);
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};
