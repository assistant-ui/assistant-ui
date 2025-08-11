import { ToolUIPart } from "../../client/types/message-types";
import { UserUITools } from "../../utils/augmentation";
import { usePart } from "./usePart";

export function useToolPart(): ToolUIPart;
export function useToolPart<
  NAME extends keyof UserUITools = keyof UserUITools
>(toolName: NAME): ToolUIPart<NAME>;
export function useToolPart<
  TSelector,
  NAME extends keyof UserUITools = keyof UserUITools
>(toolName: NAME, selector: (part: ToolUIPart<NAME>) => TSelector): TSelector;
export function useToolPart<
  TSelector,
  NAME extends keyof UserUITools = keyof UserUITools
>(
  toolName?: NAME,
  selector?: (part: ToolUIPart<NAME>) => TSelector
): TSelector | ToolUIPart<NAME> {
  return usePart((p) => {
    if (
      toolName ? p.type !== `tool-${toolName}` : !p.type.startsWith("tool-")
    ) {
      throw new Error(
        `useToolPart called outside of the correct tool part.`
      );
    }

    const toolPart = p as ToolUIPart<NAME>;
    if (selector) return selector(toolPart);
    return toolPart;
  });
}
