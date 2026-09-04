"use client";

import {
  type AssistantState,
  AuiIf,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { ArrowDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SelectionToolbar } from "@/components/assistant-ui/elements/quote.aui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Composer, EditComposer } from "./composer";
import { ConversationBudget } from "./conversation-budget";
import { Greeting } from "./greeting";
import { AssistantMessage, UserMessage } from "./messages";
import { FollowUps, Suggestions } from "./suggestions";

const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  (!s.thread.isLoading || s.threads.isLoading);

const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

export function Thread(): ReactNode {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className={cn(
          // The gutter is reserved whether or not a scrollbar is showing, so the
          // thread and its composer do not shift sideways on the first reply
          // that overflows. Only classic scrollbars take layout space, so the
          // jump appears on Windows and on macOS set to always show them.
          "relative flex flex-1 [scrollbar-gutter:stable_both-edges] flex-col overflow-y-auto px-4 pt-6 md:px-6",
          isEmpty && "justify-center",
        )}
      >
        <AuiIf condition={isNewChatView}>
          <Greeting />
        </AuiIf>
        <AuiIf condition={isHistoryLoadingView}>
          <div
            role="status"
            className="animate-in fade-in fill-mode-both mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-y-6 [animation-delay:150ms] [animation-duration:200ms]"
          >
            <span className="sr-only">Loading conversation</span>
            <Skeleton className="rounded-thread ml-auto h-9 w-2/5 motion-reduce:animate-none" />
            <div className="flex flex-col gap-y-2">
              <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-4/5 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-3/5 motion-reduce:animate-none" />
            </div>
            <Skeleton className="rounded-thread ml-auto h-9 w-1/3 motion-reduce:animate-none" />
            <div className="flex flex-col gap-y-2">
              <Skeleton className="h-4 w-10/12 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
            </div>
          </div>
        </AuiIf>

        <div className="mb-12 flex flex-col gap-y-6 empty:hidden">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.composer.isEditing) return <EditComposer />;
              if (message.role === "user") return <UserMessage />;
              if (message.role === "assistant") return <AssistantMessage />;
              return null;
            }}
          </ThreadPrimitive.Messages>
        </div>

        <ThreadPrimitive.ViewportFooter
          className={cn(
            "bg-background mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-3 overflow-visible pb-5",
            !isEmpty && "sticky bottom-0 mt-auto",
          )}
        >
          <ThreadPrimitive.ScrollToBottom asChild>
            <button
              type="button"
              aria-label="Scroll to bottom"
              className="border-foreground/10 bg-background hover:border-foreground/25 rounded-control absolute -top-11 z-10 grid size-8 place-items-center self-center border transition-colors disabled:invisible"
            >
              <ArrowDownIcon className="size-4" />
            </button>
          </ThreadPrimitive.ScrollToBottom>
          <FollowUps />
          <ConversationBudget>
            <Composer />
            <AuiIf condition={isNewChatView}>
              <div className="min-h-8">
                <AuiIf condition={(s) => s.composer.isEmpty}>
                  <Suggestions />
                </AuiIf>
              </div>
            </AuiIf>
          </ConversationBudget>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
      <SelectionToolbar className="border-foreground/10 rounded-control" />
    </ThreadPrimitive.Root>
  );
}
