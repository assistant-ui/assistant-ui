import { createOpenAI } from "@ai-sdk/openai";
import { withTracing as posthogWithTracing } from "@posthog/ai";
import { resolveModelId } from "@/constants/model";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL!,
});

export function getModel(modelId?: string) {
  const raw = typeof modelId === "string" ? modelId.trim() : undefined;
  const id = resolveModelId(raw);

  if (raw && raw !== id) {
    console.warn(
      `[ai/provider] invalid model "${raw}", falling back to "${id}"`,
    );
  }

  return openai.chat(id);
}

type AppModel = ReturnType<typeof getModel>;

// @posthog/ai types withTracing against @ai-sdk/provider v2/v3 (LanguageModelV2),
// while AI SDK v7 models are LanguageModelV4; the wrapped model is identical at
// runtime, so the provider-version gap is bridged here at the single boundary.
export function withTracing(
  model: AppModel,
  client: Parameters<typeof posthogWithTracing>[1],
  options: Parameters<typeof posthogWithTracing>[2],
): AppModel {
  return posthogWithTracing(model as never, client, options) as AppModel;
}
