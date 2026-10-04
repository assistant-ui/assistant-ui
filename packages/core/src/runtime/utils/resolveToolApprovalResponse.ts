import {
  toolApprovalAcceptsText,
  type ToolApprovalAnswer,
  type ToolApprovalDisplay,
  type ToolApprovalOption,
  type ToolApprovalQuestion,
  type ToolApprovalResponse,
} from "../../types/message";
import type { RespondToToolApprovalOptions } from "../interfaces/thread-runtime-core";

const APPROVED_BY_KIND: Record<string, boolean> = {
  "allow-once": true,
  "allow-always": true,
  "reject-once": false,
  "reject-always": false,
};

type ResolvableApproval = {
  readonly id: string;
  readonly display?: ToolApprovalDisplay;
  readonly allowFreeform?: boolean;
  readonly options?: readonly ToolApprovalOption[];
  readonly questions?: readonly ToolApprovalQuestion[];
};

const validateAnswers = (
  approval: ResolvableApproval,
  answers: Readonly<Record<string, ToolApprovalAnswer>>,
) => {
  const questions = approval.questions ?? [];
  if (questions.length === 0)
    throw new Error(
      `Tool approval "${approval.id}" has display "questions" but declares no questions`,
    );

  const questionIds = new Set<string>();
  for (const question of questions) {
    if (questionIds.has(question.id))
      throw new Error(
        `Tool approval "${approval.id}" declares question "${question.id}" more than once`,
      );
    questionIds.add(question.id);
  }

  for (const id of Object.keys(answers)) {
    if (!questionIds.has(id))
      throw new Error(
        `Tool approval "${approval.id}" has no question with id "${id}"`,
      );
  }

  for (const question of questions) {
    const answer = Object.hasOwn(answers, question.id)
      ? answers[question.id]
      : undefined;
    const optionIds = answer?.optionIds ?? [];
    const text = answer?.text;
    if (optionIds.length === 0 && (text === undefined || text.trim() === ""))
      throw new Error(
        `Tool approval "${approval.id}" is missing an answer to question "${question.id}"`,
      );
    if (optionIds.length > 1 && !question.multiple)
      throw new Error(
        `Question "${question.id}" takes one option, not ${optionIds.length}`,
      );
    if (new Set(optionIds).size !== optionIds.length)
      throw new Error(
        `Question "${question.id}" lists an option more than once`,
      );
    for (const optionId of optionIds) {
      if (!question.options?.some((option) => option.id === optionId))
        throw new Error(
          `Question "${question.id}" has no option with id "${optionId}"`,
        );
    }
    if (
      text !== undefined &&
      (question.options?.length ?? 0) > 0 &&
      !question.allowFreeform
    )
      throw new Error(
        `Question "${question.id}" does not accept a typed answer; it must declare allowFreeform`,
      );
  }
};

const resolveQuestionsResponse = (
  approval: ResolvableApproval,
  response: ToolApprovalResponse,
): RespondToToolApprovalOptions => {
  const reason = response.reason;
  if ("answers" in response) {
    if ("approved" in response || "optionId" in response || "text" in response)
      throw new Error(
        `Tool approval "${approval.id}" takes its answers alone, without approved, optionId or text`,
      );
    validateAnswers(approval, response.answers);
    return {
      approvalId: approval.id,
      approved: true,
      answers: response.answers,
      ...(reason != null && { reason }),
    };
  }

  if (
    "approved" in response &&
    response.approved === false &&
    !("optionId" in response) &&
    response.text === undefined
  )
    return {
      approvalId: approval.id,
      approved: false,
      ...(reason != null && { reason }),
    };

  throw new Error(
    `Tool approval "${approval.id}" asks questions; respond with answers, or with approved: false to dismiss it`,
  );
};

/**
 * Resolves a renderer-facing approval response (boolean, optionId, free-form
 * answer, or questionnaire answers) against the approval's request shape into
 * the runtime-facing decision shape.
 */
export const resolveToolApprovalResponse = (
  approval: ResolvableApproval,
  response: ToolApprovalResponse,
): RespondToToolApprovalOptions => {
  if (approval.display === "questions")
    return resolveQuestionsResponse(approval, response);
  if ("answers" in response)
    throw new Error(
      `Tool approval "${approval.id}" asks no questions; answers only resolve a display "questions" request`,
    );

  const text = response.text;
  if (text !== undefined && !toolApprovalAcceptsText(approval))
    throw new Error(
      `Tool approval "${approval.id}" does not accept a free-form answer; the request must declare display "text" or allowFreeform`,
    );

  let approved: boolean;
  let optionId: string | undefined;

  if ("optionId" in response) {
    const option = approval.options?.find((o) => o.id === response.optionId);
    if (!option)
      throw new Error(
        `Tool approval has no option with id "${response.optionId}"`,
      );

    if ("approved" in response) {
      approved = response.approved;
    } else {
      if (!Object.hasOwn(APPROVED_BY_KIND, option.kind))
        throw new Error(
          `Tool approval option "${option.id}" has a custom kind "${option.kind}"; respond with an explicit approved value instead`,
        );
      approved = APPROVED_BY_KIND[option.kind]!;
    }
    optionId = option.id;
  } else if ("approved" in response) {
    approved = response.approved;
  } else {
    // A bare answer resolves a question, where answering is not refusing. On a
    // decision the approval itself is the authorization, so inferring one from
    // a typed note would let the note authorize the call.
    if (approval.display !== "text" && approval.display !== "select")
      throw new Error(
        `Tool approval "${approval.id}" is a decision, not a question; respond with an explicit approved value, optionally alongside the answer`,
      );
    approved = true;
  }

  return {
    approvalId: approval.id,
    approved,
    ...(optionId !== undefined && { optionId }),
    ...(text !== undefined && { text }),
    ...(response.reason != null && { reason: response.reason }),
  };
};
