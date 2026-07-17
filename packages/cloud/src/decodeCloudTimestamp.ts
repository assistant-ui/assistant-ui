const invalidTimestamp = (field: string) =>
  new Error(`Invalid Assistant Cloud response timestamp for "${field}"`);

export const decodeCloudTimestamp = (value: unknown, field: string): Date => {
  if (typeof value !== "string") throw invalidTimestamp(field);

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw invalidTimestamp(field);
  }

  return date;
};
