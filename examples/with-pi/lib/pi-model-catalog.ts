import type { ModelOption } from "@/components/assistant-ui/elements/model-selector.aui";
import type { PiModelInfo, PiThinkingLevel } from "@assistant-ui/react-pi";
import { modelKey } from "./model-key";

export type PiModelOption = ModelOption & {
  provider: string;
  modelId: string;
  efforts?: { id: string; name: string }[];
};

const THINKING_LEVEL_NAMES: Record<PiThinkingLevel, string> = {
  off: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "xHigh",
};

const ALL_THINKING_LEVELS = Object.keys(
  THINKING_LEVEL_NAMES,
) as PiThinkingLevel[];

export const toPiModelOptions = (
  catalog: readonly PiModelInfo[],
): PiModelOption[] =>
  catalog.map((model) => {
    const efforts = model.supportsThinking
      ? (model.availableThinkingLevels ?? ALL_THINKING_LEVELS).map((id) => ({
          id,
          name: THINKING_LEVEL_NAMES[id],
        }))
      : undefined;

    return {
      id: modelKey(model.provider, model.modelId),
      name: model.name ?? model.modelId,
      description: model.provider,
      provider: model.provider,
      modelId: model.modelId,
      ...(efforts ? { efforts } : {}),
    };
  });
