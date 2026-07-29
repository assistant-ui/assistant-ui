const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const coerceValue = (
  schema: unknown,
  value: unknown,
): { value: unknown; invalid: boolean } => {
  if (!isRecord(schema) || typeof value !== "string") {
    return { value, invalid: false };
  }
  if (schema.type !== "number" && schema.type !== "integer") {
    return { value, invalid: false };
  }

  const number = Number(value);
  if (value.trim() === "") return { value, invalid: false };
  if (!Number.isFinite(number)) return { value, invalid: true };
  if (schema.type === "integer" && !Number.isInteger(number)) {
    return { value, invalid: true };
  }
  return { value: number, invalid: false };
};

const isBooleanSchema = (schema: unknown): schema is Record<string, unknown> =>
  isRecord(schema) && schema.type === "boolean";

const getDraftValue = (draft: Record<string, unknown>, name: string) =>
  Object.hasOwn(draft, name) ? draft[name] : undefined;

const isAbsentDraftValue = (value: unknown) =>
  value === undefined || value === null || value === "";

const isInvalidBooleanDraftValue = (schema: unknown, value: unknown) =>
  isBooleanSchema(schema) &&
  !isAbsentDraftValue(value) &&
  typeof value !== "boolean";

export const prepareElicitationContent = (
  requestedSchema: unknown,
  draft: Record<string, unknown>,
): {
  content: Record<string, unknown>;
  missingRequired: readonly string[];
  invalid: readonly string[];
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

  const preparedDraft = Object.entries(draft).flatMap(([name, value]) => {
    const schema = properties[name];
    if (value === undefined || value === null) return [];
    if (
      isBooleanSchema(schema) &&
      (isAbsentDraftValue(value) || isInvalidBooleanDraftValue(schema, value))
    ) {
      return [];
    }

    const coerced = coerceValue(schema, value);
    return coerced.invalid ? [] : [[name, coerced.value]];
  });
  const invalid = Object.entries(draft).flatMap(([name, value]) => {
    const schema = properties[name];
    return isInvalidBooleanDraftValue(schema, value) ||
      coerceValue(schema, value).invalid
      ? [name]
      : [];
  });
  const requiredBooleans = required.flatMap((name) =>
    isBooleanSchema(properties[name]) &&
    isAbsentDraftValue(getDraftValue(draft, name))
      ? [
          [
            name,
            typeof properties[name].default === "boolean"
              ? properties[name].default
              : false,
          ],
        ]
      : [],
  );

  return {
    content: Object.fromEntries([...preparedDraft, ...requiredBooleans]),
    missingRequired: required.filter(
      (name) =>
        !isBooleanSchema(properties[name]) &&
        isAbsentDraftValue(getDraftValue(draft, name)),
    ),
    invalid,
  };
};
