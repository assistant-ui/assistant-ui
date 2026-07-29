const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const coerceValue = (schema: unknown, value: unknown): unknown => {
  if (!isRecord(schema) || typeof value !== "string") return value;
  if (schema.type !== "number" && schema.type !== "integer") return value;

  const number = Number(value);
  if (value.trim() === "" || !Number.isFinite(number)) return value;
  return number;
};

export const prepareElicitationContent = (
  requestedSchema: unknown,
  draft: Record<string, unknown>,
): {
  content: Record<string, unknown>;
  missingRequired: readonly string[];
} => {
  const properties =
    isRecord(requestedSchema) && isRecord(requestedSchema.properties)
      ? requestedSchema.properties
      : {};
  const required =
    isRecord(requestedSchema) && Array.isArray(requestedSchema.required)
      ? requestedSchema.required.filter(
          (property): property is string => typeof property === "string",
        )
      : [];

  return {
    content: Object.fromEntries(
      Object.entries(draft).map(([name, value]) => [
        name,
        coerceValue(properties[name], value),
      ]),
    ),
    missingRequired: required.filter(
      (name) => draft[name] === undefined || draft[name] === "",
    ),
  };
};
