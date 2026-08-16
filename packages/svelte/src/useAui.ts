import type { AssistantClient } from "@assistant-ui/store/client";
import { getAuiContext } from "./context";

/**
 * Returns the `AssistantClient` provided by the nearest {@link provideAui}.
 * Call during component initialization.
 *
 * The returned object is stable for the lifetime of the provider and always
 * forwards to the provider's current client, so it can be captured once and
 * used in event handlers: `aui.composer.send()`, `aui.thread.cancelRun()`.
 * Pair with {@link useAuiState} to read reactive state and
 * {@link useAuiEvent} to subscribe to events.
 *
 * Called outside a provider, the returned client's scope accessors throw a
 * descriptive error whenever they are used.
 */
export const useAui = (): AssistantClient => {
  return getAuiContext().aui;
};
