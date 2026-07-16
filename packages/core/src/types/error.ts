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
