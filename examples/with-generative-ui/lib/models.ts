export const MODELS = [
  { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5" },
  { id: "openai/gpt-6-astra", label: "GPT-6 astra" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export const DEFAULT_MODEL: ModelId = MODELS[0].id;

export const isModelId = (value: unknown): value is ModelId =>
  MODELS.some((model) => model.id === value);
