const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getOwn = (value: Record<string, unknown>, key: string): unknown =>
  Object.hasOwn(value, key) ? value[key] : undefined;

const matchesType = (type: unknown, value: unknown): boolean => {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    default:
      return false;
  }
};

export const initialElicitationDraft = (
  requestedSchema: unknown,
): Record<string, unknown> => {
  if (!isRecord(requestedSchema)) return {};

  const properties = getOwn(requestedSchema, "properties");
  if (!isRecord(properties)) return {};

  return Object.fromEntries(
    Object.keys(properties).flatMap((name) => {
      const schema = properties[name];
      if (!isRecord(schema) || !Object.hasOwn(schema, "default")) return [];

      const value = schema.default;
      return matchesType(getOwn(schema, "type"), value) ? [[name, value]] : [];
    }),
  );
};
