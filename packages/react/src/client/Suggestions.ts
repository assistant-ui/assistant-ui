import { resource, tapState, withKey } from "@assistant-ui/tap";
import { type ClientOutput, tapClientLookup } from "@assistant-ui/store";
import type { SuggestionsState, SuggestionState } from "../types/scopes";

export type SuggestionConfig =
  | string
  | { title: string; label: string; prompt: string };

const SuggestionClient = resource(
  (state: SuggestionState): ClientOutput<"suggestion"> => {
    return {
      state,
      methods: {
        getState: () => state,
      },
    };
  },
);

export const Suggestions = resource(
  ({
    suggestions,
  }: {
    suggestions?: SuggestionConfig[];
  }): ClientOutput<"suggestions"> => {
    const [state] = tapState<SuggestionsState>(() => {
      const normalizedSuggestions =
        suggestions?.map((s) => {
          if (typeof s === "string") {
            return {
              title: s,
              label: "",
              prompt: s,
            };
          }
          return {
            title: s.title,
            label: s.label,
            prompt: s.prompt,
          };
        }) ?? [];

      return {
        suggestions: normalizedSuggestions,
      };
    });

    const suggestionClients = tapClientLookup(
      () =>
        state.suggestions.map((suggestion, index) =>
          withKey(index, SuggestionClient(suggestion)),
        ),
      [state.suggestions],
    );

    return {
      state,
      methods: {
        getState: () => state,
        suggestion: ({ index }: { index: number }) => {
          return suggestionClients.get({ index });
        },
      },
    };
  },
);
