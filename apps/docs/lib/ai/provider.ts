import { gateway } from "ai";
import { DEFAULT_MODEL_ID, isValidModelId } from "@/constants/model";

export function getModel(modelId?: string) {
  const raw = typeof modelId === "string" ? modelId.trim() : undefined;
  const id = raw && isValidModelId(raw) ? raw : DEFAULT_MODEL_ID;

  if (raw && raw !== id) {
    console.warn(
      `[ai/provider] invalid model "${raw}", falling back to "${id}"`,
    );
  }

  return gateway(id);
}
