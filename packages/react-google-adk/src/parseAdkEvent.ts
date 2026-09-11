import { isRecord } from "@assistant-ui/core/internal";
import type { AdkEvent } from "./types";

const invalidField = (
  errorPrefix: string,
  field: string,
  expectation: string,
): Error =>
  new Error(`${errorPrefix}: expected "${field}" to be ${expectation}.`);

export function parseAdkEventValue(
  value: unknown,
  errorPrefix: string,
): AdkEvent {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new Error(`${errorPrefix}: expected a non-empty object.`);
  }

  const {
    id: rawId,
    content: rawContent,
    ...event
  } = value as Record<string, unknown>;
  if (
    rawId != null &&
    typeof rawId !== "string" &&
    (typeof rawId !== "number" || !Number.isFinite(rawId))
  ) {
    throw new Error(
      `${errorPrefix}: expected "id" to be a string or finite number when present.`,
    );
  }

  let content: Record<string, unknown> | undefined;
  if (rawContent != null) {
    if (!isRecord(rawContent)) {
      throw invalidField(errorPrefix, "content", "an object when present");
    }

    const { parts, ...contentFields } = rawContent;
    if (parts != null && (!Array.isArray(parts) || !parts.every(isRecord))) {
      throw invalidField(
        errorPrefix,
        "content.parts",
        "an array of objects when present",
      );
    }

    content = {
      ...contentFields,
      ...(parts != null && { parts }),
    };
  }

  const errorMessage =
    "error" in event && typeof event.error === "string"
      ? event.error
      : undefined;
  return {
    ...event,
    ...(content !== undefined && { content }),
    ...(rawId != null && { id: String(rawId) }),
    ...(errorMessage !== undefined &&
      !("errorMessage" in event) &&
      !("error_message" in event) && {
        errorMessage,
      }),
  } as AdkEvent;
}
