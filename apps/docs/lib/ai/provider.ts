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
 * Picks the model for a chat request. Models that expose a reasoning effort
 * run through the Responses API so their reasoning summaries stream to the
 * client; everything else stays on Chat Completions.
 */
export function resolveChatModel(config: ChatModelRequestConfig | undefined) {
  const id = resolveRequestedModelId(
    typeof config?.modelName === "string" ? config.modelName : undefined,
  );

  if (!supportsReasoningEffort(id)) {
    return {
      model: openai.chat(id),
      providerOptions: undefined,
      reasoning: false as const,
    };
  }

  const reasoningEffort = isReasoningEffort(config?.reasoningEffort)
    ? config.reasoningEffort
    : "low";

  return {
    model: openai.responses(id),
    providerOptions: {
      openai: { reasoningEffort, reasoningSummary: "auto" },
    },
    reasoning: true as const,
  };
}
