type ValidationError = {
  property: string;
  message: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getOwn = (value: Record<string, unknown>, key: string): unknown =>
  Object.hasOwn(value, key) ? value[key] : undefined;

export const matchesType = (
  type: unknown,
  value: unknown,
): boolean | undefined => {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        Number.isInteger(value)
      );
    case "boolean":
      return typeof value === "boolean";
    default:
      return undefined;
  }
};

const typeMessage = (type: string) =>
  `Expected ${type === "integer" ? "an" : "a"} ${type}.`;

export const validateElicitationContent = (
  requestedSchema: unknown,
  content: Record<string, unknown>,
): readonly ValidationError[] => {
  if (!isRecord(requestedSchema)) return [];

  const errors: ValidationError[] = [];
  const properties = getOwn(requestedSchema, "properties");
  if (isRecord(properties)) {
    for (const property of Object.keys(properties)) {
      if (!Object.hasOwn(content, property)) continue;

      const schema = properties[property];
      if (!isRecord(schema)) continue;

      const value = content[property];
      const type = getOwn(schema, "type");
      if (typeof type === "string" && matchesType(type, value) === false) {
        errors.push({ property, message: typeMessage(type) });
      }

      const values = getOwn(schema, "enum");
      if (
        Array.isArray(values) &&
        !values.some((enumValue) => Object.is(enumValue, value))
      ) {
        errors.push({
          property,
          message: "Must be one of the allowed values.",
        });
      }
    }
  }

  const required = getOwn(requestedSchema, "required");
  if (Array.isArray(required)) {
    for (const property of required) {
      if (typeof property !== "string" || Object.hasOwn(content, property)) {
        continue;
      }
      errors.push({ property, message: "This property is required." });
    }
  }

  return errors;
};
