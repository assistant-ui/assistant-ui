import { createOpenAI } from "@ai-sdk/openai";
import { resolveModelId } from "@/constants/model";

export const openai = createOpenAI({
  apiKey: process.env["ASSISTANT_BILLING_GATEWAY_API_KEY"]!,
  baseURL: process.env["ASSISTANT_BILLING_GATEWAY_BASE_URL"]!,
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
