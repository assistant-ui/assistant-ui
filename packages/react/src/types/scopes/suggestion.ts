export type SuggestionState = {
  title: string;
  label: string;
  prompt: string;
};

export type SuggestionMethods = {
  getState(): SuggestionState;
};

export type SuggestionMeta = {
  source: "suggestions";
  query: { index: number };
};

export type SuggestionClientSchema = {
  state: SuggestionState;
  methods: SuggestionMethods;
  meta: SuggestionMeta;
};
