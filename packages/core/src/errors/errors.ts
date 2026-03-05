/**
 * Error catalog for assistant-ui.
 *
 * This module re-exports the error IDs and provides the full catalog
 * with messages. It is intended for tooling (docs site, devtools, CLI)
 * that always needs the messages — NOT for the runtime AssistantError
 * class, which inlines the messages behind a dev-only branch.
 */

import type { AssistantErrorId } from "./error-ids";

export type { AssistantErrorId } from "./error-ids";

export const ERROR_CATALOG: Record<AssistantErrorId, { message: string }> = {
  "store/unstable-selector": {
    message:
      "useAuiState: Your selector returns a new object on every call, causing unnecessary re-renders. Wrap your selector with useShallow() or split into multiple useAuiState() calls.",
  },
  "store/missing-provider": {
    message:
      "You are using a component or hook that requires an AuiProvider. Wrap your component in an <AuiProvider> component.",
  },
  "store/entire-state-selected": {
    message:
      "You tried to return the entire AssistantState from useAuiState. This is not supported due to technical limitations. Select a specific slice of state instead.",
  },
  "runtime/missing-runtime": {
    message:
      "You are using a component or hook that requires an AssistantRuntimeProvider. Ensure your component tree is wrapped in an AssistantRuntimeProvider.",
  },
  "runtime/tool-not-found": {
    message:
      "A tool call was received but no matching tool handler was found. Register a tool handler using useAssistantTool() or makeAssistantTool().",
  },
};
