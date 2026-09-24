import { createOpenAI } from "@ai-sdk/openai";
import {
  REASONING_EFFORTS,
  isReasoningEffort,
  resolveModelId,
  supportsReasoningEffort,
} from "@/lib/model";

// Every route behind this resolver is anonymous and rate limited per request,
// so the effort a caller may buy with one request stops at medium.
const MAX_PUBLIC_EFFORT_INDEX = REASONING_EFFORTS.indexOf("medium");

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL!,
});

function resolveRequestedModelId(modelId?: string) {
  const raw = typeof modelId === "string" ? modelId.trim() : undefined;
  const id = resolveModelId(raw);

  if (raw && raw !== id) {
    console.warn(
      `[ai/provider] invalid model "${raw}", falling back to "${id}"`,
    );
  }

  return id;
}

export type ChatModelRequestConfig = {
  modelName?: unknown;
  reasoningEffort?: unknown;
};

/**
 * Picks the model for a chat request. OpenAI reasoning models run through the
 * Responses API, because GPT-6 models accept function calling on Chat
 * Completions only with reasoning turned off; a request that names a reasoning
 * effort also streams reasoning summaries to the client. Other models stay on
 * Chat Completions.
 */
export function resolveChatModel(config?: unknown) {
  const requestConfig =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as ChatModelRequestConfig)
      : undefined;
  const id = resolveRequestedModelId(
    typeof requestConfig?.modelName === "string"
      ? requestConfig.modelName
      : undefined,
  );
  const requestedEffort = isReasoningEffort(requestConfig?.reasoningEffort)
    ? requestConfig.reasoningEffort
    : undefined;
  const reasoningEffort =
    requestedEffort === undefined
      ? undefined
      : REASONING_EFFORTS[
          Math.min(
            REASONING_EFFORTS.indexOf(requestedEffort),
            MAX_PUBLIC_EFFORT_INDEX,
          )
        ];

  if (!supportsReasoningEffort(id)) {
    return {
      model: openai.chat(id),
      providerOptions: undefined,
      reasoning: false as const,
    };
  }

  if (reasoningEffort === undefined) {
    return {
      model: openai.responses(id),
      providerOptions: { openai: { store: false } },
      reasoning: false as const,
    };
  }

  return {
    model: openai.responses(id),
    providerOptions: {
      openai: { reasoningEffort, reasoningSummary: "auto", store: false },
    },
    reasoning: true as const,
  };
}
