"use client";

import { memo, useMemo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  type OpenCodePermissionRequest,
  type OpenCodePermissionResponse,
  type OpenCodeQuestionRequest,
  type QuestionAnswer,
  useOpenCodeThreadState,
} from "@assistant-ui/react-opencode";
import {
  CheckCircle2Icon,
  CircleHelpIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import { OpenCodePermissionCard } from "@/components/tools/opencode-permission-card";
import {
  OpenCodeQuestionCard,
  getQuestionSummary,
} from "@/components/tools/opencode-question-card";

type ToolPermissionInteraction = {
  request: OpenCodePermissionRequest;
  state: "pending" | "resolved";
  reply?: OpenCodePermissionResponse;
};

type ToolQuestionInteraction = {
  request: OpenCodeQuestionRequest;
  state: "pending" | "answered" | "rejected";
  answers?: readonly QuestionAnswer[];
};

const ASK_QUESTION_TOOL_NAMES = [
  "ask_question",
  "request_user_input",
  "requestUserInput",
] as const;

const useOpenCodeToolInteractions = (toolCallId: string) => {
  const interactions = useOpenCodeThreadState((state) => state.interactions);

  return useMemo(() => {
    const permissions: ToolPermissionInteraction[] = [];
    const questions: ToolQuestionInteraction[] = [];

    for (const request of Object.values(interactions.permissions.pending)) {
      if (request.tool?.callID === toolCallId) {
        permissions.push({ request, state: "pending" });
      }
    }

    for (const resolved of Object.values(interactions.permissions.resolved)) {
      if (resolved.request.tool?.callID === toolCallId) {
        permissions.push({
          request: resolved.request,
          state: "resolved",
          reply: resolved.reply,
        });
      }
    }

    for (const request of Object.values(interactions.questions.pending)) {
      if (request.tool?.callID === toolCallId) {
        questions.push({ request, state: "pending" });
      }
    }

    for (const answered of Object.values(interactions.questions.answered)) {
      if (answered.request.tool?.callID === toolCallId) {
        questions.push({
          request: answered.request,
          state: "answered",
          answers: answered.answers,
        });
      }
    }

    for (const rejected of Object.values(interactions.questions.rejected)) {
      if (rejected.request.tool?.callID === toolCallId) {
        questions.push({
          request: rejected.request,
          state: "rejected",
        });
      }
    }

    return { permissions, questions };
  }, [interactions, toolCallId]);
};

const ToolInteractionStack = ({ toolCallId }: { toolCallId: string }) => {
  const { permissions, questions } = useOpenCodeToolInteractions(toolCallId);

  if (permissions.length === 0 && questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {permissions.map((permission) => (
        <OpenCodePermissionCard
          key={`${permission.request.id}-${permission.state}`}
          request={permission.request}
          state={permission.state}
          {...(permission.reply ? { reply: permission.reply } : {})}
        />
      ))}
      {questions.map((question) => (
        <OpenCodeQuestionCard
          key={`${question.request.id}-${question.state}`}
          request={question.request}
          state={question.state}
          {...(question.answers ? { answers: question.answers } : {})}
        />
      ))}
    </div>
  );
};

export const withOpenCodeToolInteractions = <TArgs = any, TResult = any>(
  BaseComponent: ToolCallMessagePartComponent<TArgs, TResult>,
): ToolCallMessagePartComponent<TArgs, TResult> => {
  const WrappedComponent: ToolCallMessagePartComponent<TArgs, TResult> = memo(
    (props) => {
      return (
        <div className="space-y-3">
          <BaseComponent {...props} />
          <ToolInteractionStack toolCallId={props.toolCallId} />
        </div>
      );
    },
  );

  WrappedComponent.displayName = `withOpenCodeToolInteractions(${
    BaseComponent.displayName || BaseComponent.name || "Tool"
  })`;

  return WrappedComponent;
};

export const AskQuestionInline: ToolCallMessagePartComponent = memo(
  ({ toolCallId, toolName, status }) => {
    const { questions } = useOpenCodeToolInteractions(toolCallId);
    const primaryQuestion = questions[0]?.request;
    const label = getQuestionSummary(primaryQuestion);
    const statusType = status?.type ?? "complete";

    return (
      <div className="flex items-center gap-2 py-0.5 text-muted-foreground text-sm">
        {statusType === "requires-action" ? (
          <CircleHelpIcon className="size-3.5 shrink-0" />
        ) : statusType === "running" ? (
          <LoaderIcon className="size-3.5 shrink-0 animate-spin" />
        ) : statusType === "incomplete" ? (
          <XCircleIcon className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2Icon className="size-3.5 shrink-0" />
        )}

        <span className="flex items-center gap-1.5 truncate">
          <span className="font-medium">
            {ASK_QUESTION_TOOL_NAMES.includes(
              toolName as (typeof ASK_QUESTION_TOOL_NAMES)[number],
            )
              ? "ask_question"
              : toolName}
          </span>
          <span className="opacity-60">{label}</span>
        </span>
      </div>
    );
  },
);
AskQuestionInline.displayName = "AskQuestionInline";
