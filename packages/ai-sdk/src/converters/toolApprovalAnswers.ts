import type { ToolApprovalAnswer } from "@assistant-ui/core";

export const normalizeToolApprovalAnswers = (
  answers: unknown,
): Readonly<Record<string, ToolApprovalAnswer>> | undefined => {
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    return undefined;

  return Object.fromEntries(
    Object.entries(answers).flatMap(([id, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value))
        return [];
      const { optionIds, text } = value as Record<string, unknown>;
      const answer: ToolApprovalAnswer = {
        ...(Array.isArray(optionIds) && {
          optionIds: optionIds.filter(
            (optionId): optionId is string => typeof optionId === "string",
          ),
        }),
        ...(typeof text === "string" && { text }),
      };
      return answer.optionIds?.length || answer.text !== undefined
        ? [[id, answer]]
        : [];
    }),
  );
};
