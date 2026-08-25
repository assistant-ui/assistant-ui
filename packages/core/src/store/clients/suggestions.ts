import { useMemo } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useClientLookup } from "@assistant-ui/store/client";
import type { SuggestionsState } from "../scopes/suggestions";
import type { SuggestionState } from "../scopes/suggestion";
import type { ThreadSuggestion } from "../../runtime/interfaces/thread-runtime-core";

export type SuggestionConfig =
  | string
  | { title: string; label: string; prompt: string };

const normalizeSuggestion = (suggestion: SuggestionConfig): SuggestionState => {
  if (typeof suggestion === "string") {
    return {
      title: suggestion,
      label: "",
      prompt: suggestion,
    };
  }

  return {
    title: suggestion.title,
    label: suggestion.label,
    prompt: suggestion.prompt,
  };
};

const isSameSuggestion = (a: SuggestionState, b: SuggestionState) =>
  a.title === b.title && a.label === b.label && a.prompt === b.prompt;

const useSuggestionClient = (
  state: SuggestionState,
): ClientOutput<"suggestion"> => {
  return {
    getState: () => state,
  };
};

const SuggestionClient = resource(useSuggestionClient);

const useSuggestionsClient = (
  state: SuggestionsState,
): ClientOutput<"suggestions"> => {
  const suggestionClients = useClientLookup(
    state.suggestions.map((suggestion, index) =>
      withKey(index, SuggestionClient(suggestion), [suggestion]),
    ),
  );

  return {
    getState: () => state,
    suggestion: ({ index }: { index: number }) => {
      return suggestionClients.get({ index });
    },
  };
};

const useStaticSuggestions = (
  suggestions?: SuggestionConfig[],
): ClientOutput<"suggestions"> => {
  const cell = useMemo(() => ({}) as { state?: SuggestionsState }, []);
  const previousState = cell.state;
  const normalizedSuggestions = (suggestions ?? []).map((suggestion, index) => {
    const normalized = normalizeSuggestion(suggestion);
    const previous = previousState?.suggestions[index];
    return previous && isSameSuggestion(previous, normalized)
      ? previous
      : normalized;
  });
  const state =
    previousState &&
    previousState.suggestions.length === normalizedSuggestions.length &&
    normalizedSuggestions.every(
      (suggestion, index) => suggestion === previousState.suggestions[index],
    )
      ? previousState
      : { suggestions: normalizedSuggestions };
  cell.state = state;

  return useSuggestionsClient(state);
};

export const Suggestions = resource(useStaticSuggestions);

const useThreadSuggestions = (
  suggestions: readonly ThreadSuggestion[],
): ClientOutput<"suggestions"> => {
  const state = useMemo<SuggestionsState>(
    () => ({
      suggestions: suggestions.map((s) => ({
        title: s.title ?? s.prompt,
        label: s.label ?? "",
        prompt: s.prompt,
      })),
    }),
    [suggestions],
  );

  return useSuggestionsClient(state);
};

export const ThreadSuggestions = resource(useThreadSuggestions);
