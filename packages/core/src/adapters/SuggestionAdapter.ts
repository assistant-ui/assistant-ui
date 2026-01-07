import type { ThreadMessage } from "../types/AssistantTypes";

/**
 * A suggested prompt that can be displayed to the user.
 */
export type ThreadSuggestion = {
  prompt: string;
};

type SuggestionAdapterGenerateOptions = {
  messages: readonly ThreadMessage[];
};

/**
 * Interface for generating suggested prompts based on conversation context.
 */
export type SuggestionAdapter = {
  /**
   * Generates suggestions based on the current conversation messages.
   *
   * @param options - Options containing the conversation messages
   * @returns Promise or AsyncGenerator yielding suggestions
   */
  generate: (
    options: SuggestionAdapterGenerateOptions,
  ) =>
    | Promise<readonly ThreadSuggestion[]>
    | AsyncGenerator<readonly ThreadSuggestion[], void>;
};
