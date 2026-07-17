const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const invalidTimestamp = (field: string) =>
  new Error(`Invalid Assistant Cloud response timestamp for "${field}"`);

export const normalizeCloudTimestamp = (
  value: unknown,
  field: string,
): Date => {
  if (typeof value !== "string" || !timestampPattern.test(value)) {
    throw invalidTimestamp(field);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw invalidTimestamp(field);
  }

  return date;
};
