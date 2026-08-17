import type { AdkEvent } from "./types";

export function parseAdkEventValue(
  value: unknown,
  errorPrefix: string,
): AdkEvent {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length === 0
  ) {
    throw new Error(`${errorPrefix}: expected a non-empty object.`);
  }

  const { id: rawId, ...event } = value as Record<string, unknown>;
  if (
    rawId != null &&
    typeof rawId !== "string" &&
    (typeof rawId !== "number" || !Number.isFinite(rawId))
  ) {
    throw new Error(
      `${errorPrefix}: expected "id" to be a string or finite number when present.`,
    );
  }

  const errorMessage =
    "error" in event && typeof event.error === "string"
      ? event.error
      : undefined;
  return {
    ...event,
    ...(rawId != null && { id: String(rawId) }),
    ...(errorMessage !== undefined &&
      !("errorMessage" in event) &&
      !("error_message" in event) && {
        errorMessage,
      }),
  } as AdkEvent;
}
