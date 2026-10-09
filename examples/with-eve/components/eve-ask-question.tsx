"use client";

import {
  defineToolkit,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  ToolFallbackApproval,
  ToolFallbackResult,
} from "@/components/assistant-ui/elements/tool-fallback.aui";

type AskQuestionArgs = {
  question?: string;
  options?: { label: string; description?: string }[];
};

type AskQuestionOutcome =
  | { answer: string }
  | { note: string }
  | { raw: unknown };

const readOutcome = (
  result: unknown,
  isError: boolean | undefined,
): AskQuestionOutcome | undefined => {
  if (result === undefined) return undefined;
  if (!isError && typeof result === "object" && result !== null) {
    if ("interrupted" in result && result.interrupted === true)
      return { note: "Skipped" };
    if ("status" in result && result.status === "unavailable")
      return { note: "Unavailable in this session" };
    if (
      "status" in result &&
      result.status === "answered" &&
      "answer" in result &&
      typeof result.answer === "string"
    )
      return { answer: result.answer };
  }
  return { raw: result };
};

const EveAskQuestion: ToolCallMessagePartComponent<AskQuestionArgs> = ({
  args,
  approval,
  result,
  isError,
  status,
  respondToApproval,
}) => {
  const outcome = readOutcome(result, isError);
  const settled =
    approval != null &&
    (approval.approved !== undefined || approval.resolution !== undefined);

  if (
    approval != null &&
    (outcome === undefined ||
      (settled &&
        ("answer" in outcome || (isError && approval.approved === false))))
  ) {
    return (
      <ToolFallbackApproval
        className="aui-eve-ask-question my-2"
        approval={
          outcome && "answer" in outcome && approval.text === undefined
            ? { ...approval, text: outcome.answer }
            : approval
        }
        respondToApproval={respondToApproval}
        status={status}
      />
    );
  }

  if (outcome === undefined) return null;

  const prompt = approval?.prompt ?? args.question;
  return (
    <div className="aui-eve-ask-question my-2 flex flex-col gap-1.5">
      {prompt && (
        <p className="text-muted-foreground whitespace-pre-line">{prompt}</p>
      )}
      {"raw" in outcome ? (
        <ToolFallbackResult result={outcome.raw} />
      ) : (
        <p className="whitespace-pre-line">
          {"answer" in outcome ? outcome.answer : outcome.note}
        </p>
      )}
    </div>
  );
};

export const eveAskQuestionToolkit = defineToolkit({
  ask_question: {
    type: "backend",
    display: "standalone",
    render: EveAskQuestion,
  },
});
