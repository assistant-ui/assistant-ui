import { useMemo } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useClientLookup } from "@assistant-ui/store/client";
import { shallowEqual } from "@assistant-ui/store/internal";
import type { SuggestionsState } from "../scopes/suggestions";
import type { SuggestionState } from "../scopes/suggestion";
import type { ThreadSuggestion } from "../../runtime/interfaces/thread-runtime-core";

export type SuggestionConfig =
  | string
  | { title: string; label: string; prompt: string };

const useStableSuggestionsState = (
  next: SuggestionsState,
): SuggestionsState => {
  const cell = useMemo(() => ({}) as { state?: SuggestionsState }, []);
  const previous = cell.state;

  const suggestions = next.suggestions.map((suggestion, index) => {
    const previousSuggestion = previous?.suggestions[index];
    return previousSuggestion && shallowEqual(previousSuggestion, suggestion)
      ? previousSuggestion
      : suggestion;
  });
  const state =
    previous &&
    previous.suggestions.length === suggestions.length &&
    suggestions.every(
      (suggestion, index) => suggestion === previous.suggestions[index],
    )
      ? previous
      : { suggestions };

  cell.state = state;
  return state;
};

const useSuggestionClient = (
  state: SuggestionState,
): ClientOutput<"suggestion"> => {
  return {
    getState: () => state,
  };
};

const SuggestionClient = resource(useSuggestionClient);

const useSuggestionsClient = (
  nextState: SuggestionsState,
): ClientOutput<"suggestions"> => {
  const state = useStableSuggestionsState(nextState);
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
  return useSuggestionsClient({
    suggestions: (suggestions ?? []).map((s) =>
      typeof s === "string"
        ? { title: s, label: "", prompt: s }
        : { title: s.title, label: s.label, prompt: s.prompt },
    ),
  });
};

export const Suggestions = resource(useStaticSuggestions);

const useThreadSuggestions = (
  suggestions: readonly ThreadSuggestion[],
): ClientOutput<"suggestions"> => {
  return useSuggestionsClient({
    suggestions: suggestions.map((s) => ({
      title: s.title ?? s.prompt,
      label: s.label ?? "",
      prompt: s.prompt,
    })),
  });
};

export const ThreadSuggestions = resource(useThreadSuggestions);
