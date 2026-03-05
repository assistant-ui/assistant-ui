import type { AssistantErrorId } from "./error-ids";

declare const process: { env: { NODE_ENV?: string } };

const ERROR_BASE_URL = "https://www.assistant-ui.com/sdk-error";

export type AssistantErrorInfo = Record<string, unknown>;

// Ternary is reliably dead-code eliminated by bundlers in production:
// process.env.NODE_ENV is replaced with "production", the condition becomes
// `false`, and the object literal is removed from the bundle.
const DEV_MESSAGES: Record<AssistantErrorId, string> | undefined =
  process.env.NODE_ENV !== "production"
    ? {
        "store/unstable-selector":
          "useAuiState: Your selector returns a new object on every call, causing unnecessary re-renders. Wrap your selector with useShallow() or split into multiple useAuiState() calls.",
        "store/missing-provider":
          "You are using a component or hook that requires an AuiProvider. Wrap your component in an <AuiProvider> component.",
        "store/entire-state-selected":
          "You tried to return the entire AssistantState from useAuiState. This is not supported due to technical limitations. Select a specific slice of state instead.",
        "runtime/missing-runtime":
          "You are using a component or hook that requires an AssistantRuntimeProvider. Ensure your component tree is wrapped in an AssistantRuntimeProvider.",
        "runtime/tool-not-found":
          "A tool call was received but no matching tool handler was found. Register a tool handler using useAssistantTool() or makeAssistantTool().",
      }
    : undefined;

const buildErrorUrl = (id: AssistantErrorId, info?: AssistantErrorInfo) => {
  const url = `${ERROR_BASE_URL}/${id}`;
  if (!info) return url;
  try {
    const json = JSON.stringify(info);
    const encoded = btoa(json);
    return `${url}?info=${encoded}`;
  } catch {
    return url;
  }
};

const formatMessage = (id: AssistantErrorId, info?: AssistantErrorInfo) => {
  const url = buildErrorUrl(id, info);

  const devMessage = DEV_MESSAGES?.[id];
  if (devMessage) {
    return `${devMessage}\n\nLearn more: ${url}`;
  }

  return `assistant-ui error: ${id}\n\nLearn more: ${url}`;
};

/**
 * Structured error type for assistant-ui SDK errors.
 *
 * Each error has a predefined ID from the error catalog. In development,
 * errors include a detailed message. In production, errors include only
 * the error ID and a URL with full documentation and an AI-assisted fix prompt.
 *
 * Error IDs follow the pattern `<domain>/<error-name>` (e.g. `store/unstable-selector`).
 *
 * @example
 * ```typescript
 * throw new AssistantError("store/missing-provider");
 *
 * // With additional context
 * throw new AssistantError("runtime/tool-not-found", {
 *   toolName: "get_weather",
 *   stack: new Error().stack,
 * });
 * ```
 */
export class AssistantError extends Error {
  readonly id: AssistantErrorId;
  readonly url: string;
  readonly info: AssistantErrorInfo | undefined;

  constructor(id: AssistantErrorId, info?: AssistantErrorInfo) {
    const url = buildErrorUrl(id, info);
    super(formatMessage(id, info));

    this.name = "AssistantError";
    this.id = id;
    this.url = url;
    this.info = info;
  }
}
