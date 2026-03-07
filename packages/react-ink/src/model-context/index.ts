// Re-export shared from core/react
export {
  makeAssistantTool,
  type AssistantTool,
  makeAssistantToolUI,
  type AssistantToolUI,
  makeAssistantDataUI,
  type AssistantDataUI,
  useAssistantTool,
  type AssistantToolProps,
  useAssistantToolUI,
  type AssistantToolUIProps,
  useAssistantDataUI,
  type AssistantDataUIProps,
  useAssistantInstructions,
  useInlineRender,
  type Toolkit,
  type ToolDefinition,
  Tools,
  DataRenderers,
} from "@assistant-ui/core/react";

// Core pass-through (unchanged)
export type {
  ModelContext,
  ModelContextProvider,
  LanguageModelConfig,
  LanguageModelV1CallSettings,
} from "@assistant-ui/core";

export { mergeModelContexts } from "@assistant-ui/core";

export type { Tool } from "assistant-stream";

export { tool } from "@assistant-ui/core";

export { Suggestions, type SuggestionConfig } from "@assistant-ui/core/store";

export { ModelContextRegistry } from "@assistant-ui/core";
export type {
  ModelContextRegistryToolHandle,
  ModelContextRegistryInstructionHandle,
  ModelContextRegistryProviderHandle,
} from "@assistant-ui/core";
