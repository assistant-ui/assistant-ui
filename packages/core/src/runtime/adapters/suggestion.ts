import type { ThreadMessage } from "../../types";
import type { ThreadSuggestion } from "../core/thread-runtime-core";

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
