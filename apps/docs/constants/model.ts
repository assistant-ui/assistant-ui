export const MODELS = [
  // OpenAI
  {
    name: "GPT-5.4 Nano",
    value: "gpt-5.4-nano",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 400_000,
  },
  {
    name: "GPT-5.4 Mini",
    value: "gpt-5.4-mini",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 400_000,
  },
  // Google
  {
    name: "Gemini 3.1 Flash Lite",
    value: "google-ai-studio/gemini-3.1-flash-lite-preview",
    icon: "/icons/google.svg",
    disabled: false,
    contextWindow: 1_048_576,
  },
  // xAI
  {
    name: "Grok 4.1 Fast",
    value: "grok/grok-4-1-fast",
    icon: "/icons/xai.svg",
    disabled: false,
    contextWindow: 2_000_000,
  },
  {
    name: "Grok 3 Mini",
    value: "grok/grok-3-mini",
    icon: "/icons/xai.svg",
    disabled: false,
    contextWindow: 131_072,
  },
  // Groq
  {
    name: "Llama 4 Scout 17B",
    value: "groq/meta-llama/llama-4-scout-17b-16e-instruct",
    icon: "/icons/meta.svg",
    disabled: false,
    contextWindow: 131_072,
  },
  {
    name: "Qwen3 32B",
    value: "groq/qwen/qwen3-32b",
    icon: "/icons/groq.svg",
    disabled: false,
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
