export const DEFAULT_MODEL_ID = "google/gemini-3-flash";

export const MODELS = [
  {
    name: "GPT-5 Nano",
    value: "gpt-5-nano",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 400_000,
  },
  {
    name: "Gemini 3.0 Flash",
    value: "google/gemini-3-flash",
    icon: "/icons/google.svg",
    disabled: false,
    contextWindow: 1_000_000,
  },
  {
    name: "Kimi K2.5",
    value: "moonshotai/kimi-k2.5",
    icon: "/icons/kimi.svg",
    disabled: false,
    contextWindow: 256_000,
  },
  {
    name: "GLM 5",
    value: "zai/glm-5",
    icon: "/icons/zai.svg",
    disabled: false,
    contextWindow: 202_752,
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
] as const;

export type Model = (typeof MODELS)[number];

const ACTIVE_MODELS = MODELS.filter((m) => !m.disabled);
const VALID_MODEL_IDS = new Set<string>(ACTIVE_MODELS.map((m) => m.value));

export function isValidModelId(id: string): boolean {
  return VALID_MODEL_IDS.has(id);
}
