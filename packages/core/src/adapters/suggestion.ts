import type { ThreadMessage } from "../types/message";
import type { ThreadSuggestion } from "../runtime/interfaces/thread-runtime-core";
import { getThreadMessageText } from "../utils/text";

export type SuggestionAdapterGenerateOptions = {
  messages: readonly ThreadMessage[];
  signal?: AbortSignal;
};

export type SuggestionAdapter = {
  generate: (
    options: SuggestionAdapterGenerateOptions,
  ) =>
    | Promise<readonly ThreadSuggestion[]>
    | AsyncGenerator<readonly ThreadSuggestion[], void>;
};

export type CreateSuggestionAdapterOptions = {
  complete: (options: {
    prompt: string;
    signal?: AbortSignal;
  }) => Promise<readonly string[]>;
  count?: number | undefined;
  instructions?: string | undefined;
  maxMessages?: number | undefined;
};

export const createSuggestionAdapter = (
  options: CreateSuggestionAdapterOptions,
): SuggestionAdapter => {
  const count = options.count ?? 3;
  const maxMessages = options.maxMessages ?? 10;

  return {
    async generate({ messages, signal }) {
      const recent = messages.slice(-maxMessages);
      const transcript = recent
        .map((message) => {
          const text = getThreadMessageText(message).trim();
          if (!text) return null;
          return `${message.role}: ${text}`;
        })
        .filter((line): line is string => line != null)
        .join("\n");

      let prompt =
        `Based on the following conversation, suggest exactly ${count} short follow-up prompts that the USER would plausibly send next. ` +
        `Write each prompt in the user's voice as something they would type. ` +
        `Return only the prompts, one per line, with no numbering or extra commentary.\n\n` +
        `Conversation:\n${transcript}`;

      if (options.instructions) {
        prompt += `\n\nAdditional instructions:\n${options.instructions}`;
      }

      const completeOptions: {
        prompt: string;
        signal?: AbortSignal;
      } = { prompt };
      if (signal !== undefined) {
        completeOptions.signal = signal;
      }

      const results = await options.complete(completeOptions);
      return results
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, count)
        .map((prompt) => ({ prompt }));
    },
  };
};
