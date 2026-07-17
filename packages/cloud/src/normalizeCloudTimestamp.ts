const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})[T ]/;
const postgresTimestampPattern =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/;

const isLeapYear = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number) =>
  [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];

const invalidTimestamp = (field: string) =>
  new Error(`Invalid Assistant Cloud response timestamp for "${field}"`);

const normalizePostgresTimestamp = (value: string) => {
  const match = postgresTimestampPattern.exec(value);
  if (!match) return value;

  const fraction = match[3] ? `.${match[3].slice(0, 3).padEnd(3, "0")}` : "";
  return `${match[1]}T${match[2]}${fraction}Z`;
};

export const normalizeCloudTimestamp = (
  value: unknown,
  field: string,
): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") throw invalidTimestamp(field);

  const match = calendarDatePattern.exec(value);
  if (!match) throw invalidTimestamp(field);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = daysInMonth(year, month);
  if (maxDay === undefined || day < 1 || day > maxDay) {
    throw invalidTimestamp(field);
  }

  const date = new Date(normalizePostgresTimestamp(value));
  if (Number.isNaN(date.getTime())) throw invalidTimestamp(field);

  return date;
};
