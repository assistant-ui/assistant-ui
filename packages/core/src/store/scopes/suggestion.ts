export type SuggestionState = {
  title: string;
  label: string;
  prompt: string;
  /** Set as `metadata.custom` on the message the suggestion sends. */
  metadata?: Record<string, unknown>;
};

export type SuggestionMethods = {
  getState(): SuggestionState;
};

export type SuggestionMeta = {
  source: "suggestions";
  query: { index: number };
};

export type SuggestionClientSchema = {
  methods: SuggestionMethods;
  meta: SuggestionMeta;
};
