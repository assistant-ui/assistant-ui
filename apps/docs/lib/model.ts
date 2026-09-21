export const MODELS = [
  // OpenAI
  {
    name: "GPT-5.6 Luna",
    value: "gpt-5.6-luna",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 1_050_000,
    reasoning: true,
  },
  // Google
  {
    name: "Gemini 3.1 Flash Lite",
    value: "google-ai-studio/gemini-3.1-flash-lite",
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
  // DeepSeek
  {
    name: "DeepSeek V4 Flash",
    value: "deepseek/deepseek-v4-flash",
    icon: "/icons/deepseek.svg",
    disabled: false,
    contextWindow: 1_000_000,
  },
  // Groq
  {
    name: "GPT-OSS 20B",
    value: "groq/openai/gpt-oss-20b",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 131_072,
  },
  {
    name: "GPT-OSS 120B",
    value: "groq/openai/gpt-oss-120b",
    icon: "/icons/openai.svg",
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

export const REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return REASONING_EFFORTS.includes(value as ReasoningEffort);
}

export function supportsReasoningEffort(modelId: string): boolean {
  const model = MODELS.find((m) => m.value === modelId);
  return (
    model !== undefined && "reasoning" in model && model.reasoning === true
  );
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
