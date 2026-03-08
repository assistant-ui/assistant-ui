export const MODELS = [
  {
    name: "GPT-5.4",
    value: "openai/gpt-5.4",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 1_000_000,
  },
  {
    name: "GPT-5 Nano",
    value: "openai/gpt-5-nano",
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
    name: "Deepseek V3.2",
    value: "deepseek/deepseek-v3.2",
    icon: "/icons/deepseek.svg",
    disabled: false,
    contextWindow: 164_000,
  },
  {
    name: "Claude Sonnet 4.6",
    value: "anthropic/claude-sonnet-4.6",
    icon: "/icons/anthropic.svg",
    disabled: true,
    contextWindow: 200_000,
  },
] as const;

export type Model = (typeof MODELS)[number];
export type KnownModelId = Model["value"];

const DEFAULT_MODEL = MODELS[0];
export const DEFAULT_MODEL_ID: KnownModelId = DEFAULT_MODEL.value;
export const DEFAULT_CONTEXT_WINDOW = DEFAULT_MODEL.contextWindow;

export function getContextWindow(modelId: string): number {
  const model = MODELS.find((m) => m.value === modelId);
  return model?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
}

const ACTIVE_MODELS = MODELS.filter((m) => !m.disabled);
const AVAILABLE_MODEL_IDS = new Set<KnownModelId>(
  ACTIVE_MODELS.map((m) => m.value),
);

export function isAvailableModelId(id: string): id is KnownModelId {
  return AVAILABLE_MODEL_IDS.has(id as KnownModelId);
}

export function resolveModelId(input: string | undefined): KnownModelId {
  const raw = typeof input === "string" ? input.trim() : "";
  return raw && isAvailableModelId(raw) ? raw : DEFAULT_MODEL_ID;
}
