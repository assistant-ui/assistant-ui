import {
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";

export const shouldContinueAfterOpenUIPrompt = ({
  messages,
}: {
  messages: UIMessage[];
}) => {
  if (!lastAssistantMessageIsCompleteWithToolCalls({ messages })) {
    return false;
  }

  const message = messages.at(-1);
  if (!message || message.role !== "assistant") {
    return false;
  }

  const lastStepStartIndex = message.parts.reduce(
    (lastIndex, part, index) =>
      part.type === "step-start" ? index : lastIndex,
    -1,
  );

  const toolParts = message.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUIPart);

  return (
    toolParts.every((part) => part.state === "output-available") &&
    toolParts.some((part) => getToolName(part) === "prompt_openui")
  );
};
