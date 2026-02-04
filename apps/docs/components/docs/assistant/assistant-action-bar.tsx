"use client";

import { useState, type ReactNode } from "react";
import { ActionBarPrimitive } from "@assistant-ui/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { FeedbackPopover, type FeedbackCategory } from "./feedback-popover";

function getMessageText(
  content: readonly { type: string; text?: string }[],
): string {
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function getToolCalls(
  content: readonly { type: string; toolName?: string; args?: unknown }[],
): Array<{ toolName: string; args: Record<string, unknown> }> {
  return content
    .filter(
      (p): p is { type: "tool-call"; toolName: string; args: unknown } =>
        p.type === "tool-call",
    )
    .map((p) => ({
      toolName: p.toolName,
      args: (p.args as Record<string, unknown>) ?? {},
    }));
}

export function AssistantActionBar(): ReactNode {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const aui = useAui();
  const messageId = useAuiState(({ message }) => message.id);
  const parentId = useAuiState(({ message }) => message.parentId);
  const content = useAuiState(({ message }) => message.content);
  const threadId = useAuiState(({ threadListItem }) => threadListItem.id);
  const messages = useAuiState(({ thread }) => thread.messages);
  const isPositiveSubmitted = useAuiState(
    ({ message }) => message.metadata?.submittedFeedback?.type === "positive",
  );
  const isNegativeSubmitted = useAuiState(
    ({ message }) => message.metadata?.submittedFeedback?.type === "negative",
  );

  const userMessage = messages.find((m) => m.id === parentId);
  const userQuestion = userMessage ? getMessageText(userMessage.content) : "";
  const assistantResponse = getMessageText(content);
  const toolCalls = getToolCalls(content);

  const handlePositiveFeedback = () => {
    aui.message().submitFeedback({ type: "positive" });
    analytics.assistant.feedbackSubmitted({
      threadId,
      messageId,
      type: "positive",
      userQuestion,
      assistantResponse,
      toolCalls,
    });
  };

  const handleNegativeFeedback = (
    category: FeedbackCategory,
    comment?: string,
  ) => {
    aui.message().submitFeedback({ type: "negative" });
    analytics.assistant.feedbackSubmitted({
      threadId,
      messageId,
      type: "negative",
      category,
      ...(comment ? { comment } : {}),
      userQuestion,
      assistantResponse,
      toolCalls,
    });
  };

  return (
    <ActionBarPrimitive.Root className="mt-2 flex items-center gap-1">
      <ActionBarPrimitive.FeedbackPositive
        onClick={handlePositiveFeedback}
        className={cn(
          "rounded p-1 text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isPositiveSubmitted && "text-green-600 dark:text-green-400",
        )}
      >
        <ThumbsUpIcon className="size-4" />
      </ActionBarPrimitive.FeedbackPositive>

      <FeedbackPopover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        onSubmit={handleNegativeFeedback}
      >
        <ActionBarPrimitive.FeedbackNegative
          onClick={() => setPopoverOpen(true)}
          className={cn(
            "rounded p-1 text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isNegativeSubmitted && "text-red-600 dark:text-red-400",
          )}
        >
          <ThumbsDownIcon className="size-4" />
        </ActionBarPrimitive.FeedbackNegative>
      </FeedbackPopover>
    </ActionBarPrimitive.Root>
  );
}
