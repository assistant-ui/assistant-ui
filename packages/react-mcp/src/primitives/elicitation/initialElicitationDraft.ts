import {
  getOwn,
  isRecord,
  matchesType,
} from "../../resources/validateElicitationContent";

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
      return matchesType(getOwn(schema, "type"), value) === true
        ? [[name, value]]
        : [];
    }),
  );
};
