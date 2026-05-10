import {
  resource,
  tapCallback,
  tapMemo,
  tapState,
  withKey,
} from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { tapClientLookup } from "@assistant-ui/store";
import type {
  Suggestion,
  SuggestionConfig,
  SuggestionsState,
} from "../scopes/suggestions";
import type { SuggestionState } from "../scopes/suggestion";

export type { SuggestionConfig } from "../scopes/suggestions";

const normalize = (s: SuggestionConfig): Suggestion => {
  if (typeof s === "string") {
    return { title: s, label: "", prompt: s };
  }
  return s;
};

type RuntimeEntry = { id: number; suggestion: Suggestion };

const SuggestionClient = resource(
  (state: SuggestionState): ClientOutput<"suggestion"> => {
    return {
      getState: () => state,
    };
  },
);

const SuggestionsResource = resource(
  (suggestions?: SuggestionConfig[]): ClientOutput<"suggestions"> => {
    const nextRuntimeId = tapMemo(() => {
      let counter = 0;
      return () => ++counter;
    }, []);

    const configSuggestions = tapMemo(
      () => (suggestions ?? []).map(normalize),
      [suggestions],
    );

    const [runtimeEntries, setRuntimeEntries] = tapState<RuntimeEntry[]>(
      () => [],
    );

    const mergedSuggestions = tapMemo(() => {
      if (runtimeEntries.length === 0) return configSuggestions;
      return [...configSuggestions, ...runtimeEntries.map((e) => e.suggestion)];
    }, [configSuggestions, runtimeEntries]);

    const state = tapMemo<SuggestionsState>(
      () => ({ suggestions: mergedSuggestions }),
      [mergedSuggestions],
    );

    const add = tapCallback(
      (suggestion: SuggestionConfig) => {
        const entry: RuntimeEntry = {
          id: nextRuntimeId(),
          suggestion: normalize(suggestion),
        };
        setRuntimeEntries((prev) => [...prev, entry]);
        return () => {
          setRuntimeEntries((prev) =>
            prev.some((e) => e.id === entry.id)
              ? prev.filter((e) => e.id !== entry.id)
              : prev,
          );
        };
      },
      [nextRuntimeId],
    );

    const set = tapCallback(
      (next: SuggestionConfig[]) => {
        setRuntimeEntries((prev) => {
          if (prev.length === 0 && next.length === 0) return prev;
          return next.map((s) => ({
            id: nextRuntimeId(),
            suggestion: normalize(s),
          }));
        });
      },
      [nextRuntimeId],
    );

    const clear = tapCallback(() => {
      setRuntimeEntries((prev) => (prev.length === 0 ? prev : []));
    }, []);

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
      add,
      set,
      clear,
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
