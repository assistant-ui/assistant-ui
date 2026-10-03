"use client";

import {
  defineToolkit,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import { ToolFallbackApproval } from "@/components/assistant-ui/elements/tool-fallback.aui";

type AskQuestionArgs = {
  prompt?: string;
  options?: { id: string; label: string }[];
  allowFreeform?: boolean;
};

type AskQuestionResult = {
  status: "answered" | "ignored";
  optionId?: string;
  text?: string;
};

const EveAskQuestion: ToolCallMessagePartComponent<
  AskQuestionArgs,
  AskQuestionResult
> = ({ args, approval, result, status, respondToApproval }) => {
  const prompt = approval?.prompt ?? args.prompt;
  const isPending =
    approval !== undefined &&
    approval.approved === undefined &&
    approval.resolution === undefined;

  if (isPending) {
    return (
      <div className="aui-eve-ask-question my-2 flex flex-col gap-2">
        <ToolFallbackApproval
          approval={approval}
          respondToApproval={respondToApproval}
          status={status}
        />
      </div>
    );
  }

  const optionId = approval?.optionId ?? result?.optionId;
  const answer =
    approval?.text ??
    result?.text ??
    approval?.options?.find((option) => option.id === optionId)?.label ??
    optionId;
  const skipped =
    approval?.resolution !== undefined || result?.status === "ignored";

  return (
    <div className="aui-eve-ask-question my-2 flex flex-col gap-1">
      {prompt && <p className="text-foreground">{prompt}</p>}
      {answer ? (
        <p className="text-muted-foreground text-sm">{answer}</p>
      ) : skipped ? (
        <p className="text-muted-foreground text-sm">Skipped</p>
      ) : null}
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
