import type {
  ToolUIPart,
  UIMessage,
  UIMessageLike,
  UIMessagePartLike,
  ToolUIPartLike,
  UIPart,
} from "../../client/types/message-types";

const isToolUIPart = (
  part: UIMessagePartLike
): part is ToolUIPartLike & { type: `tool-${string}` } => {
  return part.type?.startsWith("tool-") ?? false;
};

export const generateToolCallId = () => {
  return `tool-call-${Math.random().toString(36).substring(2, 15)}`;
};

export function fromUIMessageLikes(
  inputs: readonly UIMessageLike[]
): UIMessage[] {
  const toolCallPartMap = new Map<string, ToolUIPart>();
  return inputs
    .map((input): UIMessage => {
      if ("text" in input) {
        return {
          role: input.role,
          parts: [{ type: "text", text: input.text }],
        };
      }

      const convertedParts: UIPart[] = input.parts
        .map((part): UIPart | null => {
          // Handle text objects
          if (part.type === undefined || part.type === "text") {
            return { type: "text", text: part.text };
          }

          // Handle tool objects
          if (isToolUIPart(part)) {
            const toolPart = {
              type: part.type,
              toolCallId: part.toolCallId ?? generateToolCallId(),
              state:
                "state" in part
                  ? part.state
                  : "output" in part
                  ? "output-available"
                  : "errorText" in part
                  ? "output-error"
                  : "input-available",
              input: part.input,
              ...("output" in part ? { output: part.output } : {}),
              ...("errorText" in part ? { errorText: part.errorText } : {}),
              providerExecuted: part.providerExecuted,
            } as ToolUIPart;
            toolCallPartMap.set(toolPart.toolCallId, toolPart);
            return toolPart;
          }

          if (part.type === "toolOutput") {
            const toolPart = toolCallPartMap.get(part.toolCallId);
            if (!toolPart) {
              throw new Error(
                `Tool call part not found for tool call id: ${part.toolCallId}  `
              );
            }

            if (toolPart.state !== "input-available") {
              throw new Error(
                `Received tool output for tool call part that is not in input-available state: ${part.toolCallId}`
              );
            }

            if ("output" in part && part.output) {
              (toolPart as any).state = "output-available";
              (toolPart as any).output = part.output;
            } else if ("errorText" in part && part.errorText) {
              (toolPart as any).state = "output-error";
              (toolPart as any).errorText = part.errorText;
            }
            return null;
          }

          throw new Error(`Unknown part type: ${part.type}`);
        })
        .filter((part) => part !== null);

      return {
        role: input.role,
        parts: convertedParts,
      };
    })
    .filter((message) => message.parts.length > 0);
}
