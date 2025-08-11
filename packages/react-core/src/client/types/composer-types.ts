export type ComposerState = {
  readonly text: string;
};

export type ComposerActions = {
  setText(text: string): void;
  send(): void;
};
