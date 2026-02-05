"use client";

import { useState, useMemo, type ReactNode } from "react";
import { ActionBarPrimitive } from "@assistant-ui/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
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

export function AssistantActionBar(): ReactNode {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const aui = useAui();
  const messageId = useAuiState(({ message }) => message.id);
  const parentId = useAuiState(({ message }) => message.parentId);
  const content = useAuiState(({ message }) => message.content);
  const threadId = useAuiState(({ threadListItem }) => threadListItem.id);
  const messages = useAuiState(({ thread }) => thread.messages);
  const isRunning = useAuiState(
    ({ message }) => message.status?.type === "running",
  );
  const submittedFeedback = useAuiState(
    ({ message }) =>
      message.metadata?.submittedFeedback?.type as
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

  // Don't show feedback buttons while message is still streaming or if no content
  if (isRunning || !assistantHasText) {
    return null;
  }

  const handlePositiveFeedback = () => {
    if (submittedFeedback) return;
    aui.message().submitFeedback({ type: "positive" });
    analytics.assistant.feedbackSubmitted({
      threadId,
      messageId,
      type: "positive",
      user_question_length: userQuestionLength,
      assistant_response_length: assistantResponseLength,
      tool_calls_count: toolCallsCount,
      ...(toolNames.length > 0 ? { tool_names: toolNames.join(",") } : {}),
    });
  };

  const handleNegativeFeedback = (
    category: FeedbackCategory,
    comment?: string,
  ) => {
    if (submittedFeedback) return;
    aui.message().submitFeedback({ type: "negative" });
    analytics.assistant.feedbackSubmitted({
      threadId,
      messageId,
      type: "negative",
      category,
      ...(comment ? { comment_length: comment.length } : {}),
      user_question_length: userQuestionLength,
      assistant_response_length: assistantResponseLength,
      tool_calls_count: toolCallsCount,
      ...(toolNames.length > 0 ? { tool_names: toolNames.join(",") } : {}),
    });
  };

  return (
    <ActionBarPrimitive.Root className="mt-2 flex items-center gap-1">
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
