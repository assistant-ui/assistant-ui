export function collectTypeTargets(
  value,
  conditions = [],
  { stopAtTypesKey = true } = {},
) {
  if (!value || typeof value !== "object") return [];

  if (!stopAtTypesKey && typeof value.types === "string") {
    return [{ conditions, typePath: value.types }];
  }
  if (stopAtTypesKey && Object.hasOwn(value, "types")) {
    return typeof value.types === "string"
      ? [{ conditions, typePath: value.types }]
      : [];
  }

  return Object.entries(value).flatMap(([condition, nested]) =>
    collectTypeTargets(nested, [...conditions, condition], { stopAtTypesKey }),
  );
}
