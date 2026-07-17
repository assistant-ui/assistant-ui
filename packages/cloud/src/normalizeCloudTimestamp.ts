const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::\d{2})?)?$/;

const isLeapYear = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number) =>
  [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];

const invalidTimestamp = (field: string) =>
  new Error(`Invalid Assistant Cloud response timestamp for "${field}"`);

const normalizeTimestamp = (match: RegExpExecArray) => {
  const fraction = match[5] ? `.${match[5].slice(0, 3).padEnd(3, "0")}` : "";
  const rawOffset = match[6];

  // Assistant Cloud stores timezone-less database timestamps in UTC.
  const offset = rawOffset
    ? rawOffset.length === 3
      ? `${rawOffset}:00`
      : rawOffset
    : "Z";

  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}${fraction}${offset}`;
};

export const normalizeCloudTimestamp = (
  value: unknown,
  field: string,
): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") throw invalidTimestamp(field);

  const match = timestampPattern.exec(value);
  if (!match) throw invalidTimestamp(field);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = daysInMonth(year, month);
  if (maxDay === undefined || day < 1 || day > maxDay) {
    throw invalidTimestamp(field);
  }

  const date = new Date(normalizeTimestamp(match));
  if (Number.isNaN(date.getTime())) throw invalidTimestamp(field);

  return date;
};
