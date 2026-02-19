import { gateway } from "ai";
import { DEFAULT_MODEL_ID, isAvailableModelId } from "@/constants/model";

export function getModel(modelId?: string) {
  const raw = typeof modelId === "string" ? modelId.trim() : undefined;
  const id = raw && isAvailableModelId(raw) ? raw : DEFAULT_MODEL_ID;

  if (raw && raw !== id) {
    console.warn(
      `[ai/provider] invalid model "${raw}", falling back to "${id}"`,
    );
  }

  return gateway(id);
}
