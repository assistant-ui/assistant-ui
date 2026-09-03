import { createOpenAI } from "@ai-sdk/openai";
import {
  isReasoningEffort,
  resolveModelId,
  supportsReasoningEffort,
} from "@/lib/model";

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

export function getModel(modelId?: string) {
  return openai.chat(resolveRequestedModelId(modelId));
}

export type ChatModelRequestConfig = {
  modelName?: unknown;
  reasoningEffort?: unknown;
};

/**
 * Picks the model for a chat request. A request that names a reasoning effort
 * for a model that supports one runs through the Responses API so its
 * reasoning summaries stream to the client; every other request stays on Chat
 * Completions.
 */
export function resolveChatModel(config: unknown) {
  const requestConfig =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as ChatModelRequestConfig)
      : undefined;
  const id = resolveRequestedModelId(
    typeof requestConfig?.modelName === "string"
      ? requestConfig.modelName
      : undefined,
  );
  const reasoningEffort = isReasoningEffort(requestConfig?.reasoningEffort)
    ? requestConfig.reasoningEffort
    : undefined;

  if (reasoningEffort === undefined || !supportsReasoningEffort(id)) {
    return {
      model: openai.chat(id),
      providerOptions: undefined,
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
