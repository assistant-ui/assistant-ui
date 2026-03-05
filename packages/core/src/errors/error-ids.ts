/**
 * All known assistant-ui error IDs.
 *
 * Error IDs follow the pattern `<domain>/<error-name>`.
 */
export type AssistantErrorId =
  | "store/unstable-selector"
  | "store/missing-provider"
  | "store/entire-state-selected"
  | "runtime/missing-runtime"
  | "runtime/tool-not-found";
