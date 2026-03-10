import { openai } from "@ai-sdk/openai";
import { resolveModelId } from "@/constants/model";

export function getModel(modelId?: string) {
  const raw = typeof modelId === "string" ? modelId.trim() : undefined;
  const id = resolveModelId(raw);

  if (raw && raw !== id) {
    console.warn(
      `[ai/provider] invalid model "${raw}", falling back to "${id}"`,
    );
  }

  // Strip the "openai/" prefix from the model ID
  const modelName = id.replace(/^openai\//, "");
  return openai(modelName);
}
