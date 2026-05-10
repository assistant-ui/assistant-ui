import type { Unsubscribe } from "../../types/unsubscribe";
import type { SuggestionMethods } from "./suggestion";

export type Suggestion = {
  title: string;
  label: string;
  prompt: string;
};

export type SuggestionConfig =
  | string
  | { title: string; label: string; prompt: string };

export type SuggestionsState = {
  suggestions: Suggestion[];
};

export type SuggestionsMethods = {
  getState(): SuggestionsState;
  suggestion(query: { index: number }): SuggestionMethods;
  /**
   * Append a runtime suggestion. Returns an `Unsubscribe` that removes only
   * the entry created by this call, even when other entries with identical
   * content exist. Currently appends to the end; do not rely on positional
   * indices being stable across calls.
   */
  add(suggestion: SuggestionConfig): Unsubscribe;
  /**
   * Replace the runtime slice wholesale. Does not affect declaratively
   * configured suggestions passed to `Suggestions([...])`. Any `Unsubscribe`
   * returned from prior `add` calls becomes a no-op.
   */
  set(suggestions: SuggestionConfig[]): void;
  /**
   * Empty the runtime slice. Does not affect declaratively configured
   * suggestions passed to `Suggestions([...])`.
   */
  clear(): void;
};

export type SuggestionsClientSchema = {
  methods: SuggestionsMethods;
};
