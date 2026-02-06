import type { SuggestionMethods } from "./suggestion";

export type Suggestion = {
  title: string;
  label: string;
  prompt: string;
};

export type SuggestionsState = {
  suggestions: Suggestion[];
};

export type SuggestionsMethods = {
  getState(): SuggestionsState;
  suggestion(query: { index: number }): SuggestionMethods;
};

export type SuggestionsClientSchema = {
  methods: SuggestionsMethods;
};
