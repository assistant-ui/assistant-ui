export type ErrorSeverity = "critical" | "warning" | "info";

export type ErrorDisplay = "inline" | "toast" | "silent" | "dev-only";

export type AssistantErrorCode =
  | "unknown"
  | "network"
  | "provider"
  | (string & {});

export type AssistantError = {
  readonly code: AssistantErrorCode;
  readonly message: string;
  readonly severity?: ErrorSeverity;
  readonly display?: ErrorDisplay;
};

const ERROR_SEVERITIES: readonly string[] = ["critical", "warning", "info"];

const ERROR_DISPLAYS: readonly string[] = [
  "inline",
  "toast",
  "silent",
  "dev-only",
];

export const isAssistantError = (value: unknown): value is AssistantError => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.code !== "string" ||
    typeof candidate.message !== "string"
  ) {
    return false;
  }
  if (
    "severity" in candidate &&
    candidate.severity !== undefined &&
    (typeof candidate.severity !== "string" ||
      !ERROR_SEVERITIES.includes(candidate.severity))
  ) {
    return false;
  }
  if (
    "display" in candidate &&
    candidate.display !== undefined &&
    (typeof candidate.display !== "string" ||
      !ERROR_DISPLAYS.includes(candidate.display))
  ) {
    return false;
  }
  return true;
};

const MESSAGE_NOT_SENT = Symbol.for("assistant-ui.message-not-sent");

/**
 * Rejection reason for a send that never reached the backend, so nothing ran
 * and nothing is recoverable from the thread. A runtime adapter throws it from
 * `onNew` to hand the message back to the thread composer, which restores the
 * draft it cleared at dispatch time when nothing has claimed the composer
 * since. An edit composer closes at dispatch, so a rejected edit is not
 * restored.
 */
export class MessageNotSentError extends Error {
  readonly [MESSAGE_NOT_SENT] = true;

  constructor(message = "The message was not sent.") {
    super(message);
    this.name = "MessageNotSentError";
  }
}

export const isMessageNotSentError = (
  error: unknown,
): error is MessageNotSentError =>
  typeof error === "object" && error !== null && MESSAGE_NOT_SENT in error;

export const toAssistantError = (error: unknown): AssistantError => {
  if (isAssistantError(error)) return error;
  if (error instanceof Error) {
    return { code: "unknown", message: error.message };
  }
  if (typeof error === "string") {
    return { code: "unknown", message: error };
  }
  try {
    return {
      code: "unknown",
      message: `[${typeof error}] ${String(error)}`,
    };
  } catch {
    return {
      code: "unknown",
      message: `[${typeof error}]`,
    };
  }
};
