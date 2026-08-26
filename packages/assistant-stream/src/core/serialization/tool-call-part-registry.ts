import type { ToolCallStreamController } from "../modules/tool-call";

type UnknownToolCallError = (toolCallId: string) => Error;

const defaultUnknownToolCallError: UnknownToolCallError = (toolCallId) =>
  new Error(`Encountered tool call with unknown id: ${toolCallId}`);

export const createToolCallPartRegistry = () => {
  const toolCallControllers = new Map<string, ToolCallStreamController>();

  const get = (
    toolCallId: string,
    unknownError: UnknownToolCallError = defaultUnknownToolCallError,
  ) => {
    const toolCallController = toolCallControllers.get(toolCallId);
    if (!toolCallController) throw unknownError(toolCallId);
    return toolCallController;
  };

  return {
    has: (toolCallId: string) => toolCallControllers.has(toolCallId),
    start: (toolCallId: string, create: () => ToolCallStreamController) => {
      if (toolCallControllers.has(toolCallId)) {
        throw new Error(`Encountered duplicate tool call id: ${toolCallId}`);
      }
      const toolCallController = create();
      toolCallControllers.set(toolCallId, toolCallController);
      return toolCallController;
    },
    get,
    appendArgsText: (
      toolCallId: string,
      argsTextDelta: string,
      unknownError?: UnknownToolCallError,
    ) => {
      get(toolCallId, unknownError).argsText.append(argsTextDelta);
    },
    closeArgsText: (
      toolCallId: string,
      unknownError?: UnknownToolCallError,
    ) => {
      get(toolCallId, unknownError).argsText.close();
    },
    setResponse: (
      toolCallId: string,
      response: Parameters<ToolCallStreamController["setResponse"]>[0],
      unknownError?: UnknownToolCallError,
    ) => {
      get(toolCallId, unknownError).setResponse(response);
    },
    closeOpenArgsText: (closedToolCallArgs: Set<string>) => {
      for (const [toolCallId, toolCallController] of toolCallControllers) {
        if (closedToolCallArgs.has(toolCallId)) continue;
        toolCallController.argsText.close();
        closedToolCallArgs.add(toolCallId);
      }
    },
    closeAll: () => {
      toolCallControllers.forEach((toolCallController) => {
        toolCallController.close();
      });
      toolCallControllers.clear();
    },
  };
};
