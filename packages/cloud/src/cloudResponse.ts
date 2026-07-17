const invalidCloudResponse = (field: string, expected: string) =>
  new Error(
    `Invalid Assistant Cloud response for "${field}": expected ${expected}`,
  );

export const readCloudRecord = (
  value: unknown,
  field: string,
): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidCloudResponse(field, "an object");
  }
  return value as Record<string, unknown>;
};

export const readCloudArray = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) throw invalidCloudResponse(field, "an array");
  return value;
};

export const readCloudString = (value: unknown, field: string): string => {
  if (typeof value !== "string") throw invalidCloudResponse(field, "a string");
  return value;
};

export const readCloudNullableString = (
  value: unknown,
  field: string,
): string | null => {
  if (value === null) return null;
  return readCloudString(value, field);
};

export const readCloudBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== "boolean") {
    throw invalidCloudResponse(field, "a boolean");
  }
  return value;
};

export const readCloudInteger = (value: unknown, field: string): number => {
  if (!Number.isInteger(value)) throw invalidCloudResponse(field, "an integer");
  return value as number;
};
