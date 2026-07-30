import { validateElicitationContent } from "../../resources/validateElicitationContent";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const coerceValue = (schema: unknown, value: unknown): unknown => {
  if (!isRecord(schema) || typeof value !== "string") {
    return value;
  }
  if (schema.type !== "number" && schema.type !== "integer") {
    return value;
  }

  const number = Number(value);
  if (value.trim() === "") return value;
  if (!Number.isFinite(number)) return value;
  if (schema.type === "integer" && !Number.isInteger(number)) {
    return value;
  }
  return number;
};

const isBooleanSchema = (schema: unknown): schema is Record<string, unknown> =>
  isRecord(schema) && schema.type === "boolean";

const isNonStringTypedSchema = (schema: Record<string, unknown>): boolean =>
  schema.type === "boolean" ||
  schema.type === "number" ||
  schema.type === "integer";

const schemaAdmitsEmptyString = (schema: unknown): boolean => {
  if (!isRecord(schema) || isNonStringTypedSchema(schema)) return false;

  const values = Object.hasOwn(schema, "enum") ? schema.enum : undefined;
  if (Array.isArray(values)) return values.includes("");

  return Object.hasOwn(schema, "default") && schema.default === "";
};

const isAbsentDraftValue = (schema: unknown, value: unknown) =>
  value === undefined ||
  value === null ||
  (value === "" && !schemaAdmitsEmptyString(schema));

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
  const candidateContent = Object.fromEntries(
    Object.entries(draft).flatMap(([name, value]) => {
      const schema = properties[name];
      if (isAbsentDraftValue(schema, value)) return [];
      return [[name, coerceValue(schema, value)]];
    }),
  );
  const missingRequiredBooleans = validateElicitationContent(
    requestedSchema,
    candidateContent,
  ).filter(
    ({ property }) =>
      isBooleanSchema(properties[property]) &&
      !Object.hasOwn(candidateContent, property),
  );
  const contentWithBooleanDefaults = {
    ...candidateContent,
    ...Object.fromEntries(
      missingRequiredBooleans.map(({ property }) => [
        property,
        typeof properties[property].default === "boolean"
          ? properties[property].default
          : false,
      ]),
    ),
  };
  const validationErrors = validateElicitationContent(
    requestedSchema,
    contentWithBooleanDefaults,
  );
  const missingRequired = [
    ...new Set(
      validationErrors
        .filter(
          ({ property }) =>
            !Object.hasOwn(contentWithBooleanDefaults, property),
        )
        .map(({ property }) => property),
    ),
  ];
  const invalid = [
    ...new Set(
      validationErrors
        .filter(({ property }) =>
          Object.hasOwn(contentWithBooleanDefaults, property),
        )
        .map(({ property }) => property),
    ),
  ];

  return {
    content: Object.fromEntries(
      Object.entries(contentWithBooleanDefaults).filter(
        ([property]) => !invalid.includes(property),
      ),
    ),
    missingRequired,
    invalid,
  };
};
