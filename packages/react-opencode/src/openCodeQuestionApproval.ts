import type { ToolCallMessagePart } from "@assistant-ui/react";
import type { ToolApprovalAnswer } from "@assistant-ui/core";
import type { OpenCodeQuestionRequest, QuestionAnswer } from "./types";

type ToolCallApproval = NonNullable<ToolCallMessagePart["approval"]>;

export const projectOpenCodeQuestionApproval = (
  request: OpenCodeQuestionRequest,
): ToolCallApproval => ({
  id: request.id,
  display: "questions",
  questions: request.questions.map((info, index) => ({
    id: String(index),
    prompt: info.question,
    ...(info.header ? { header: info.header } : {}),
    ...(info.options.length > 0
      ? {
          options: info.options.map((option) => ({
            id: option.label,
            label: option.label,
            ...(option.description ? { description: option.description } : {}),
          })),
        }
      : {}),
    ...(info.multiple ? { multiple: true } : {}),
    ...(info.custom === false ? {} : { allowFreeform: true }),
  })),
});

export const projectAnsweredOpenCodeQuestionApproval = (entry: {
  request: OpenCodeQuestionRequest;
  answers: readonly QuestionAnswer[];
}): ToolCallApproval => {
  const answers: Record<string, ToolApprovalAnswer> = {};

  entry.request.questions.forEach((info, index) => {
    const labels = new Set(info.options.map((option) => option.label));
    const values = entry.answers[index] ?? [];
    const optionIds = values.filter((value) => labels.has(value));
    const text = values
      .filter((value) => !labels.has(value) && value.trim())
      .join(", ");
    if (optionIds.length || text) {
      answers[String(index)] = {
        ...(optionIds.length ? { optionIds } : {}),
        ...(text ? { text } : {}),
      };
    }
  });

  return {
    ...projectOpenCodeQuestionApproval(entry.request),
    approved: true,
    answers,
  };
};

export const projectRejectedOpenCodeQuestionApproval = (entry: {
  request: OpenCodeQuestionRequest;
}): ToolCallApproval => ({
  ...projectOpenCodeQuestionApproval(entry.request),
  approved: false,
});

export const toOpenCodeQuestionAnswers = (
  request: OpenCodeQuestionRequest,
  answers: Readonly<Record<string, ToolApprovalAnswer>>,
): QuestionAnswer[] =>
  request.questions.map((_, index) => {
    const answer = answers[String(index)];
    return [
      ...(answer?.optionIds ?? []),
      ...(answer?.text?.trim() ? [answer.text] : []),
    ];
  });
