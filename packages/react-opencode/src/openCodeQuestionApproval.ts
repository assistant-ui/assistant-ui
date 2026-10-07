import type { ToolCallMessagePart } from "@assistant-ui/react";
import type { ToolApprovalAnswer } from "@assistant-ui/core";
import type { OpenCodeQuestionRequest, QuestionAnswer } from "./types";

type ToolCallApproval = NonNullable<ToolCallMessagePart["approval"]>;
type QuestionInfo = OpenCodeQuestionRequest["questions"][number];

const questionsOf = (
  request: OpenCodeQuestionRequest,
): readonly QuestionInfo[] =>
  Array.isArray(request.questions) ? request.questions : [];

const optionsOf = (info: QuestionInfo) =>
  Array.isArray(info?.options)
    ? info.options.filter((option) => typeof option?.label === "string")
    : [];

/** Whether the request carries questions a questionnaire can ask. */
export const isProjectableOpenCodeQuestion = (
  request: OpenCodeQuestionRequest,
) => questionsOf(request).length > 0;

export const projectOpenCodeQuestionApproval = (
  request: OpenCodeQuestionRequest,
): ToolCallApproval => ({
  id: request.id,
  display: "questions",
  dismissible: true,
  questions: questionsOf(request).map((info, index) => {
    const options = optionsOf(info);
    return {
      id: String(index),
      prompt: typeof info?.question === "string" ? info.question : "",
      ...(typeof info?.header === "string" && info.header
        ? { header: info.header }
        : {}),
      ...(options.length > 0
        ? {
            options: options.map((option) => ({
              id: option.label,
              label: option.label,
              ...(typeof option.description === "string" && option.description
                ? { description: option.description }
                : {}),
            })),
          }
        : {}),
      ...(info?.multiple ? { multiple: true } : {}),
      ...(info?.custom === false ? {} : { allowFreeform: true }),
    };
  }),
});

export const projectAnsweredOpenCodeQuestionApproval = (entry: {
  request: OpenCodeQuestionRequest;
  answers: readonly QuestionAnswer[];
}): ToolCallApproval => {
  const answers: Record<string, ToolApprovalAnswer> = {};

  questionsOf(entry.request).forEach((info, index) => {
    const labels = new Set(optionsOf(info).map((option) => option.label));
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
  questionsOf(request).map((_, index) => {
    const answer = answers[String(index)];
    return [
      ...(answer?.optionIds ?? []),
      ...(answer?.text?.trim() ? [answer.text] : []),
    ];
  });
