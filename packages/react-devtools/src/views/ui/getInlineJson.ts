const TOO_LARGE = Symbol();

export function getInlineJson(value: unknown, limit: number) {
  if (
    Array.isArray(value) &&
    !("toJSON" in value) &&
    value.length * 2 + 1 > limit
  ) {
    return undefined;
  }

  let remaining = limit;
  try {
    const serialized = JSON.stringify(value, function (key, entry: unknown) {
      if (
        !Array.isArray(this) &&
        (entry === undefined ||
          typeof entry === "function" ||
          typeof entry === "symbol")
      ) {
        return entry;
      }
      // This lower bound stops large values without replacing JSON escaping or omission rules.
      remaining -=
        1 +
        (Array.isArray(this) ? 0 : key.length) +
        (typeof entry === "string" ? entry.length : 0);
      if (remaining < 0) throw TOO_LARGE;
      return entry;
    });
    return serialized !== undefined && serialized.length <= limit
      ? serialized
      : undefined;
  } catch (error) {
    if (error === TOO_LARGE) return undefined;
    throw error;
  }
}
