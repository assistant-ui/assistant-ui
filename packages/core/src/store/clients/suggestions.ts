import { useState } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useClientLookup } from "@assistant-ui/store";
import type { SuggestionsState } from "../scopes/suggestions";
import type { SuggestionState } from "../scopes/suggestion";

export type SuggestionConfig =
  | string
  | { title: string; label: string; prompt: string };

const useSuggestionClient = (
  state: SuggestionState,
): ClientOutput<"suggestion"> => {
  return {
    getState: () => state,
  };
};

const SuggestionClient = resource(useSuggestionClient);

const useSuggestionsResource = (
  suggestions?: SuggestionConfig[],
): ClientOutput<"suggestions"> => {
  const [state] = useState<SuggestionsState>(() => {
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

  const suggestionClients = useClientLookup(
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
};

const SuggestionsResource = resource(useSuggestionsResource);

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
