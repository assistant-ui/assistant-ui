import type { ThreadMessage } from "../types/message";
import type { ThreadSuggestion } from "../runtime/interfaces/thread-runtime-core";

type SuggestionAdapterGenerateOptions = {
  messages: readonly ThreadMessage[];
};

export type SuggestionAdapter = {
  generate: (
    options: SuggestionAdapterGenerateOptions,
  ) =>
    | Promise<readonly ThreadSuggestion[]>
    | AsyncGenerator<readonly ThreadSuggestion[], void>;
};
