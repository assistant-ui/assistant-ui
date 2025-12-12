import type { ThreadMessage } from "@assistant-ui/core";

/**
 * Options passed to the chat model run function
 */
export type ChatModelRunOptions = {
  messages: readonly ThreadMessage[];
  abortSignal: AbortSignal;
  onUpdate: (message: ThreadMessage) => void;
};

/**
 * Chat model adapter interface
 *
 * Implement this interface to connect any AI provider to assistant-ui.
 * The adapter is responsible for:
 * - Sending messages to the AI provider
 * - Streaming responses via onUpdate callback
 * - Returning the final message when complete
 */
export type ChatModelAdapter = {
  run: (options: ChatModelRunOptions) => Promise<ThreadMessage>;
};
