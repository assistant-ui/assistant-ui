import { getModel, openai } from "@/lib/ai/provider";

type XuluxReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

type XuluxRequestConfig = {
  modelName?: unknown;
  reasoningEffort?: unknown;
};

function isReasoningEffort(value: unknown): value is XuluxReasoningEffort {
  return (
    value === "none" ||
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
  );
}

export function resolveXuluxModel(config: unknown) {
  const requestConfig =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as XuluxRequestConfig)
      : undefined;
  const modelName =
    typeof requestConfig?.modelName === "string"
      ? requestConfig.modelName.trim()
      : "";
  const reasoningEffort = isReasoningEffort(requestConfig?.reasoningEffort)
    ? requestConfig.reasoningEffort
    : undefined;

  if (modelName === "gpt-5.6-luna" && reasoningEffort) {
    return {
      model: openai.responses("gpt-5.6-luna"),
      providerOptions: { openai: { reasoningEffort } },
    };
  }

  return {
    model: getModel(modelName),
    providerOptions: undefined,
  };
}
