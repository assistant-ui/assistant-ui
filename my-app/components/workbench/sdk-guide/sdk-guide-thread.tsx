"use client";

import { SDKGuideMarkdownText } from "./markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  ActionBarPrimitive,
  AssistantIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  Sparkles,
  SquareIcon,
} from "lucide-react";
import type { FC } from "react";
import { ContextIndicator } from "./context-indicator";

const SDK_SUGGESTIONS = [
  {
    title: "What's structuredContent",
    label: "vs content in tool results?",
    prompt:
      "What's the difference between structuredContent and content in tool results?",
  },
  {
    title: "Check my configuration",
    label: "for common issues",
    prompt: "Check my current configuration for issues",
  },
  {
    title: "How do I persist",
    label: "widget state?",
    prompt: "How do I persist widget state between sessions?",
  },
  {
    title: "What _meta fields",
    label: "should I set?",
    prompt: "What are the _meta fields I should set on my tool descriptor?",
  },
] as const;

export const SDKGuideThread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "100%",
      }}
    >
      <div className="flex shrink-0 items-center gap-2 border-border/50 border-b px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-3.5 text-primary" />
        </div>
        <span className="font-medium text-sm">SDK Guide</span>
      </div>

      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4"
      >
        <AssistantIf condition={({ thread }) => thread.isEmpty}>
          <SDKGuideWelcome />
        </AssistantIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: SDKGuideUserMessage,
            AssistantMessage: SDKGuideAssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mt-auto flex w-full flex-col gap-3 overflow-visible rounded-t-2xl pb-4">
          <ThreadScrollToBottom />
          <ContextIndicator />
          <SDKGuideComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-10 z-10 size-8 self-center rounded-full disabled:invisible"
      >
        <ArrowDownIcon className="size-4" />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const SDKGuideWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-6 text-primary" />
          </div>
          <h1 className="fade-in slide-in-from-bottom-1 animate-in font-semibold text-lg duration-200">
            SDK Guide
          </h1>
          <p className="fade-in slide-in-from-bottom-1 max-w-xs animate-in text-muted-foreground text-sm delay-75 duration-200">
            I can help you build ChatGPT Apps. I have access to the SDK docs and
            can inspect your current configuration.
          </p>
        </div>
      </div>
      <SDKGuideSuggestions />
    </div>
  );
};

const SDKGuideSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full grid-cols-2 gap-2 pb-4">
      {SDK_SUGGESTIONS.map((suggestion, index) => (
        <div
          key={suggestion.prompt}
          className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200"
          style={{ animationDelay: `${100 + index * 50}ms` }}
        >
          <ThreadPrimitive.Suggestion prompt={suggestion.prompt} send asChild>
            <Button
              variant="ghost"
              className="h-auto w-full flex-col items-start justify-start gap-0.5 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted"
              aria-label={suggestion.prompt}
            >
              <span className="font-medium">{suggestion.title}</span>
              <span className="text-muted-foreground">{suggestion.label}</span>
            </Button>
          </ThreadPrimitive.Suggestion>
        </div>
      ))}
    </div>
  );
};

const SDKGuideComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <div className="flex w-full flex-col rounded-xl border border-input px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20">
        <ComposerPrimitive.Input
          placeholder="Ask about the Apps SDK..."
          className="aui-composer-input mb-1 max-h-24 min-h-10 w-full resize-none bg-transparent px-3 pt-1 pb-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <div className="mx-2 mb-2 flex items-center justify-end">
          <AssistantIf condition={({ thread }) => !thread.isRunning}>
            <ComposerPrimitive.Send asChild>
              <TooltipIconButton
                tooltip="Send message"
                side="top"
                type="submit"
                variant="default"
                size="icon"
                className="size-7 rounded-full"
                aria-label="Send message"
              >
                <ArrowUpIcon className="size-4" />
              </TooltipIconButton>
            </ComposerPrimitive.Send>
          </AssistantIf>

          <AssistantIf condition={({ thread }) => thread.isRunning}>
            <ComposerPrimitive.Cancel asChild>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="size-7 rounded-full"
                aria-label="Stop generating"
              >
                <SquareIcon className="size-3 fill-current" />
              </Button>
            </ComposerPrimitive.Cancel>
          </AssistantIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-2 text-destructive text-xs dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const SDKGuideAssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="fade-in slide-in-from-bottom-1 relative w-full animate-in py-2 duration-150"
      data-role="assistant"
    >
      <div className="wrap-break-word text-foreground text-sm leading-relaxed">
        <MessagePrimitive.Parts
          components={{
            Text: SDKGuideMarkdownText,
            tools: { Fallback: ToolFallback },
          }}
        />
        <MessageError />
      </div>

      <div className="mt-1 flex">
        <SDKGuideAssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const SDKGuideAssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex gap-1 text-muted-foreground"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy" className="size-6">
          <AssistantIf condition={({ message }) => message.isCopied}>
            <CheckIcon className="size-3" />
          </AssistantIf>
          <AssistantIf condition={({ message }) => !message.isCopied}>
            <CopyIcon className="size-3" />
          </AssistantIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Retry" className="size-6">
          <RefreshCwIcon className="size-3" />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const SDKGuideUserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="fade-in slide-in-from-bottom-1 flex w-full animate-in justify-end py-2 duration-150"
      data-role="user"
    >
      <div className="max-w-[85%]">
        <div className="wrap-break-word rounded-2xl bg-primary px-3 py-2 text-primary-foreground text-sm">
          <MessagePrimitive.Parts />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
