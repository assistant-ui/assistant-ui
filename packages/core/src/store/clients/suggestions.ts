import { resource, tapState, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "../types/client";
import { tapClientLookup } from "../utils/tap-client-lookup";
import type { SuggestionsState, SuggestionState } from "../scopes";

export type SuggestionConfig =
  | string
  | { title: string; label: string; prompt: string };

const SuggestionClient = resource(
  (state: SuggestionState): ClientOutput<"suggestion"> => {
    return {
      getState: () => state,
    };
  },
);

const SuggestionsResource = resource(
  (suggestions?: SuggestionConfig[]): ClientOutput<"suggestions"> => {
    const [state] = tapState<SuggestionsState>(() => {
      const normalizedSuggestions = (suggestions ?? []).map((s) => {
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
      });

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
      getState: () => state,
      suggestion: ({ index }: { index: number }) => {
        return suggestionClients.get({ index });
      },
    };
  },
);

export const Suggestions: {
  (): import("@assistant-ui/tap").ResourceElement<
    ClientOutput<"suggestions">,
    undefined
  >;
  (
    suggestions: SuggestionConfig[],
  ): import("@assistant-ui/tap").ResourceElement<
    ClientOutput<"suggestions">,
    SuggestionConfig[]
  >;
} = SuggestionsResource as any;
