export const normalizeCloudTimestamp = (
  value: unknown,
  field: string,
): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value !== "string") {
    throw new Error(
      `Invalid Assistant Cloud response timestamp for "${field}"`,
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid Assistant Cloud response timestamp for "${field}"`,
    );
  }

  return date;
};
