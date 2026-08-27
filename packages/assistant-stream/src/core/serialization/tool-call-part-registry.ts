import type { ToolCallStreamController } from "../modules/tool-call";

export const createToolCallPartRegistry = () => {
  const toolCallControllers = new Map<string, ToolCallStreamController>();
  const closedToolCallArgs = new Set<ToolCallStreamController>();

  const tryGet = (toolCallId: string) => toolCallControllers.get(toolCallId);

  const get = (toolCallId: string) => {
    const toolCallController = tryGet(toolCallId);
    if (!toolCallController) {
      throw new Error(`Encountered tool call with unknown id: ${toolCallId}`);
    }
    return toolCallController;
  };

  const closeArgsText = (toolCallController: ToolCallStreamController) => {
    toolCallController.argsText.close();
    closedToolCallArgs.add(toolCallController);
  };

  return {
    start: (toolCallId: string, create: () => ToolCallStreamController) => {
      if (toolCallControllers.has(toolCallId)) {
        throw new Error(`Encountered duplicate tool call id: ${toolCallId}`);
      }
      const toolCallController = create();
      toolCallControllers.set(toolCallId, toolCallController);
      return toolCallController;
    },
    get,
    tryGet,
    appendArgsText: (
      toolCallController: ToolCallStreamController,
      argsTextDelta: string,
    ) => {
      toolCallController.argsText.append(argsTextDelta);
    },
    closeArgsText,
    isArgsTextClosed: (toolCallController: ToolCallStreamController) => {
      return closedToolCallArgs.has(toolCallController);
    },
    setResponse: (
      toolCallController: ToolCallStreamController,
      response: Parameters<ToolCallStreamController["setResponse"]>[0],
    ) => {
      toolCallController.setResponse(response);
      closedToolCallArgs.add(toolCallController);
    },
    closeOpenArgsText: () => {
      for (const toolCallController of toolCallControllers.values()) {
        if (closedToolCallArgs.has(toolCallController)) continue;
        closeArgsText(toolCallController);
      }
    },
    closeAll: () => {
      toolCallControllers.forEach((toolCallController) => {
        closedToolCallArgs.add(toolCallController);
        toolCallController.close();
      });
      toolCallControllers.clear();
      closedToolCallArgs.clear();
    },
  };
};
