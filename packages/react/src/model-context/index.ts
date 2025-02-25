export { makeAssistantTool, type AssistantTool } from "./makeAssistantTool";
export {
  type AssistantToolUI,
  makeAssistantToolUI,
} from "./makeAssistantToolUI";
export { useAssistantInstructions } from "./useAssistantInstructions";
export { useAssistantTool, type AssistantToolProps } from "./useAssistantTool";
export {
  useAssistantToolUI,
  type AssistantToolUIProps,
} from "./useAssistantToolUI";
export { useInlineRender } from "./useInlineRender";

export type {
  /**
   * @deprecated This type was renamed to `ModelContext`.
   */
  ModelContext as AssistantConfig,
  /**
   * @deprecated This type was renamed to `ModelContextProvider`.
   */
  ModelContextProvider as AssistantConfigProvider,
  ModelContext,
  ModelContextProvider,
  Tool,
} from "./ModelContextTypes";

export { tool } from "./tool";

/**
 * @deprecated This function was renamed to `makeAssistantVisible`.
 */
export { makeAssistantVisible as makeAssistantReadable } from "./makeAssistantVisible";
export { makeAssistantVisible } from "./makeAssistantVisible";
