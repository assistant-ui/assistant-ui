export const MODELS = [
  // OpenAI
  {
    name: "GPT-5.4 Nano",
    value: "openai/gpt-5.4-nano",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 400_000,
  },
  {
    name: "GPT-5.4 Mini",
    value: "openai/gpt-5.4-mini",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 400_000,
  },
  // Anthropic
  {
    name: "Claude Haiku 4.5",
    value: "anthropic/claude-haiku-4-5",
    icon: "/icons/anthropic.svg",
    disabled: true,
    contextWindow: 200_000,
  },
  // Google
  {
    name: "Gemini 3 Flash",
    value: "google-ai-studio/gemini-3-flash",
    icon: "/icons/google.svg",
    disabled: true,
    contextWindow: 1_000_000,
  },
  // xAI
  {
    name: "Grok 4.1 Fast",
    value: "grok/grok-4-1-fast",
    icon: "/icons/xai.svg",
    disabled: true,
    contextWindow: 131_072,
  },
  {
    name: "Grok 3 Mini Fast",
    value: "grok/grok-3-mini-fast",
    icon: "/icons/xai.svg",
    disabled: true,
    contextWindow: 131_072,
  },
  // Groq
  {
    name: "Llama 3.3 70B",
    value: "groq/llama-3.3-70b-versatile",
    icon: "/icons/meta.svg",
    disabled: true,
    contextWindow: 131_072,
  },
  {
    name: "Qwen3 32B",
    value: "groq/qwen/qwen3-32b",
    icon: "/icons/groq.svg",
    disabled: true,
    contextWindow: 131_072,
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
