import type { ThreadAssistantMessage } from "../../types/message";

export const shouldContinue = (
  result: ThreadAssistantMessage,
  humanToolNames: string[] | undefined,
) => {
  if (
    result.status?.type !== "requires-action" ||
    result.status.reason !== "tool-calls"
  )
    return false;

  const hasPendingApproval = result.content.some(
    (c) =>
      c.type === "tool-call" &&
      c.result === undefined &&
      c.approval !== undefined &&
      c.approval.approved === undefined,
  );
  if (hasPendingApproval) return false;

  // TODO legacy behavior -- make specifying human tool names required
  if (humanToolNames === undefined) {
    return result.content.every(
      (c) => c.type !== "tool-call" || !!c.result || c.approval !== undefined,
    );
  }

  return result.content.every(
    (c) =>
      c.type !== "tool-call" ||
      !!c.result ||
      c.approval !== undefined ||
      !humanToolNames.includes(c.toolName),
  );
};
