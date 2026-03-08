"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActionBarPrimitive, AuiIf } from "@assistant-ui/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { getTextLength, getToolCallToolNames } from "@/lib/assistant-metrics";
import { FeedbackPopover, type FeedbackCategory } from "./feedback-popover";

const NON_WHITESPACE_RE = /\S/;

function hasNonWhitespaceText(
  parts: readonly { type: string; text?: string }[],
): boolean {
  for (const part of parts) {
    if (part.type !== "text" || !part.text) continue;
    if (NON_WHITESPACE_RE.test(part.text)) return true;
  }
  return false;
}

function getErrorDetails(error: unknown): {
  error_name: string;
  error_message: string;
} {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message || "Unknown error",
    };
  }

  return {
    error_name: "UnknownError",
    error_message: typeof error === "string" ? error : String(error),
  };
}

export function AssistantActionBar(): ReactNode {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const feedbackShownForMessageRef = useRef<string | null>(null);
  const feedbackSubmissionStartedRef = useRef<string | null>(null);

  const aui = useAui();
  const messageId = useAuiState((s) => s.message.id);
  const parentId = useAuiState((s) => s.message.parentId);
  const content = useAuiState((s) => s.message.content);
  const threadId = useAuiState((s) => s.threadListItem.id);
  const messages = useAuiState((s) => s.thread.messages);
  const isRunning = useAuiState((s) => s.message.status?.type === "running");
  const submittedFeedback = useAuiState(
    (s) =>
      s.message.metadata?.submittedFeedback?.type as
        | "positive"
        | "negative"
        | undefined,
  );

  const userMessage = useMemo(
    () => messages.find((m) => m.id === parentId),
    [messages, parentId],
  );
  const userQuestionLength = userMessage
    ? getTextLength(userMessage.content)
    : 0;
  const assistantResponseLength = getTextLength(content);
  const toolNames = getToolCallToolNames(content);
  const toolCallsCount = toolNames.length;
  const assistantHasText = hasNonWhitespaceText(content);
  const feedbackBaseProps = useMemo(
    () => ({
      threadId,
      messageId,
      user_question_length: userQuestionLength,
      assistant_response_length: assistantResponseLength,
      tool_calls_count: toolCallsCount,
      ...(toolNames.length > 0 ? { tool_names: toolNames.join(",") } : {}),
    }),
    [
      assistantResponseLength,
      messageId,
      threadId,
      toolCallsCount,
      toolNames,
      userQuestionLength,
    ],
  );

  useEffect(() => {
    if (isRunning || !assistantHasText) return;
    if (feedbackShownForMessageRef.current === messageId) return;

    feedbackShownForMessageRef.current = messageId;
    analytics.assistant.feedbackShown(feedbackBaseProps);
  }, [assistantHasText, feedbackBaseProps, isRunning, messageId]);

  // Don't show feedback buttons while message is still streaming or if no content
  if (isRunning || !assistantHasText) {
    return null;
  }

  const handlePositiveFeedback = () => {
    if (submittedFeedback || feedbackSubmissionStartedRef.current === messageId)
      return;
    feedbackSubmissionStartedRef.current = messageId;

    analytics.assistant.feedbackClicked({
      ...feedbackBaseProps,
      type: "positive",
    });

    try {
      aui.message().submitFeedback({ type: "positive" });
    } catch (error) {
      feedbackSubmissionStartedRef.current = null;
      analytics.assistant.feedbackSubmitFailed({
        ...feedbackBaseProps,
        type: "positive",
        ...getErrorDetails(error),
      });
      toast.error("Failed to submit feedback. Please try again.");
      return;
    }

    analytics.assistant.feedbackSubmitted({
      ...feedbackBaseProps,
      type: "positive",
    });
  };

  const handleNegativeFeedback = (
    category: FeedbackCategory,
    comment?: string,
  ) => {
    if (submittedFeedback || feedbackSubmissionStartedRef.current === messageId)
      return;
    feedbackSubmissionStartedRef.current = messageId;

    const negativeFeedbackProps = {
      ...feedbackBaseProps,
      type: "negative" as const,
      category,
      ...(comment ? { comment_length: comment.length } : {}),
    };

    analytics.assistant.feedbackClicked(negativeFeedbackProps);

    try {
      aui.message().submitFeedback({ type: "negative" });
    } catch (error) {
      feedbackSubmissionStartedRef.current = null;
      analytics.assistant.feedbackSubmitFailed({
        ...negativeFeedbackProps,
        ...getErrorDetails(error),
      });
      toast.error("Failed to submit feedback. Please try again.");
      return;
    }

    analytics.assistant.feedbackSubmitted({
      ...negativeFeedbackProps,
    });
  };

  return (
    <ActionBarPrimitive.Root className="mt-2 flex items-center gap-1">
      <ActionBarPrimitive.Copy
        aria-label="Copy response"
        className={cn(
          "rounded p-1 text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
        )}
      >
        <AuiIf condition={(s) => s.message.isCopied}>
          <CheckIcon className="size-4" />
        </AuiIf>
        <AuiIf condition={(s) => !s.message.isCopied}>
          <CopyIcon className="size-4" />
        </AuiIf>
      </ActionBarPrimitive.Copy>
      <button
        type="button"
        onClick={handlePositiveFeedback}
        disabled={!!submittedFeedback}
        aria-label={
          submittedFeedback === "positive"
            ? "Positive feedback submitted"
            : "Good response"
        }
        className={cn(
          "rounded p-1 text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          submittedFeedback === "positive" &&
            "text-green-600 dark:text-green-400",
        )}
      >
        <ThumbsUpIcon className="size-4" />
      </button>

      <FeedbackPopover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        onSubmit={handleNegativeFeedback}
      >
        <button
          type="button"
          onClick={() => setPopoverOpen(true)}
          disabled={!!submittedFeedback}
          aria-label={
            submittedFeedback === "negative"
              ? "Negative feedback submitted"
              : "Report issue with response"
          }
          className={cn(
            "rounded p-1 text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            submittedFeedback === "negative" &&
              "text-red-600 dark:text-red-400",
          )}
        >
          <ThumbsDownIcon className="size-4" />
        </button>
      </FeedbackPopover>
    </ActionBarPrimitive.Root>
  );
}
