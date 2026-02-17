export const DEFAULT_DOCS_MODEL = "gpt-5-nano";

export const MODELS = [
  {
    name: "GPT-5 Nano",
    value: "gpt-5-nano",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 400_000,
  },
  {
    name: "Deepseek R1",
    value: "deepseek-r1",
    icon: "/icons/deepseek.svg",
    disabled: true,
    contextWindow: 128_000,
  },
  {
    name: "Claude 4.5 Sonnet",
    value: "claude-4.5-sonnet",
    icon: "/icons/anthropic.svg",
    disabled: true,
    contextWindow: 200_000,
  },
  {
    name: "Gemini 3.0 Flash",
    value: "gemini-3.0-flash",
    icon: "/icons/google.svg",
    disabled: true,
    contextWindow: 1_000_000,
  },
] as const;

export type Model = (typeof MODELS)[number];
