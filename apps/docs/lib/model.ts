export const MODELS = [
  {
    name: "DeepSeek V4.1 Flash",
    value: "deepseek/deepseek-flash",
    provider: "DeepSeek",
    icon: "/icons/deepseek.svg",
    disabled: false,
    contextWindow: 1_000_000,
  },
  {
    name: "GPT-6 Luna",
    value: "gpt-6-luna",
    provider: "OpenAI",
    icon: "/icons/openai.svg",
    disabled: false,
    contextWindow: 1_050_000,
    reasoning: true,
  },
  {
    name: "Claude Haiku 5.5",
    value: "anthropic/claude-haiku-5-5",
    provider: "Anthropic",
    icon: "/icons/anthropic.svg",
    disabled: false,
    contextWindow: 1_000_000,
  },
  {
    name: "GLM-5.3-Flash",
    value: "zai/glm-5.3-flash",
    provider: "Z.ai",
    icon: "/icons/zai.svg",
    disabled: false,
    contextWindow: 1_000_000,
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

export function getProvider(modelId: string): string | undefined {
  return MODELS.find((m) => m.value === modelId)?.provider;
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
