export type {
  // Language model settings
  LanguageModelV1CallSettings,
  LanguageModelConfig,
  // Model context
  ModelContext,
  ModelContextProvider,
  // Tool & instruction config
  AssistantToolProps,
  AssistantInstructionsConfig,
} from "./types";
export { mergeModelContexts } from "./types";

export { tool } from "./tool";

export { ModelContextRegistry } from "./registry";
export type {
  ModelContextRegistryToolHandle,
  ModelContextRegistryInstructionHandle,
  ModelContextRegistryProviderHandle,
} from "./registry-handles";

export {
  // Classes
  AssistantFrameHost,
  AssistantFrameProvider,
  // Constants
  FRAME_MESSAGE_CHANNEL,
} from "./frame";
export type {
  SerializedTool,
  SerializedModelContext,
  FrameMessageType,
  FrameMessage,
} from "./frame";
