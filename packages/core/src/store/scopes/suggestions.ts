import type { SuggestionMethods } from "./suggestion";

export type Suggestion = {
  title: string;
  label: string;
  prompt: string;
  /** Set as `metadata.custom` on the message the suggestion sends. */
  custom?: Record<string, unknown>;
};

export type SuggestionsState = {
  suggestions: Suggestion[];
};

export type SuggestionsMethods = {
  getState(): SuggestionsState;
  suggestion(query: { index: number }): SuggestionMethods;
};

export type SuggestionsMeta = {
  source: "thread";
  query: Record<string, never>;
};

export type SuggestionsClientSchema = {
  methods: SuggestionsMethods;
  meta: SuggestionsMeta;
};
