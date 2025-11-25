"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PaperclipIcon,
  PencilIcon,
  RefreshCwIcon,
  Square,
  Volume2Icon,
} from "lucide-react";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

import type { FC } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";

import type { BuilderConfig } from "./types";

interface BuilderPreviewProps {
  config: BuilderConfig;
}

export function BuilderPreview({ config }: BuilderPreviewProps) {
  const { components, styles } = config;

  const borderRadiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-3xl",
  }[styles.borderRadius];

  const themeClass = styles.theme === "dark" ? "dark" : "";

  return (
    <div
      className={cn("h-full w-full", themeClass)}
      style={
        {
          "--accent-color": styles.accentColor,
          "--thread-max-width": styles.maxWidth,
          fontFamily: styles.fontFamily,
        } as React.CSSProperties
      }
    >
      <ThreadPrimitive.Root
        className={cn(
          "flex h-full flex-col bg-background text-foreground",
          themeClass && "bg-zinc-900 text-zinc-100",
        )}
      >
        <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto px-4">
          {components.threadWelcome && (
            <ThreadPrimitive.Empty>
              <ThreadWelcome
                showSuggestions={components.suggestions}
                borderRadiusClass={borderRadiusClass}
              />
            </ThreadPrimitive.Empty>
          )}

          <ThreadPrimitive.Messages
            components={{
              UserMessage: () => (
                <UserMessage
                  config={config}
                  borderRadiusClass={borderRadiusClass}
                />
              ),
              AssistantMessage: () => (
                <AssistantMessage
                  config={config}
                  borderRadiusClass={borderRadiusClass}
                />
              ),
            }}
          />

          <ThreadPrimitive.If empty={false}>
            <div className="min-h-8 grow" />
          </ThreadPrimitive.If>

          <Composer config={config} borderRadiusClass={borderRadiusClass} />
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </div>
  );
}

interface ThreadWelcomeProps {
  showSuggestions: boolean;
  borderRadiusClass: string;
}

const ThreadWelcome: FC<ThreadWelcomeProps> = ({
  showSuggestions,
  borderRadiusClass,
}) => {
  return (
    <div className="mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
      <div className="flex w-full flex-grow flex-col items-center justify-center">
        <div className="flex size-full flex-col justify-center px-8">
          <div className="text-2xl font-semibold">Hello there!</div>
          <div className="text-2xl text-muted-foreground/65">
            How can I help you today?
          </div>
        </div>
      </div>
      {showSuggestions && (
        <div className="grid w-full gap-2 pb-4 md:grid-cols-2">
          {[
            { title: "What's the weather", label: "in San Francisco?" },
            { title: "Explain React hooks", label: "like useState" },
          ].map((suggestion) => (
            <ThreadPrimitive.Suggestion
              key={suggestion.title}
              prompt={`${suggestion.title} ${suggestion.label}`}
              send
              asChild
            >
              <Button
                variant="ghost"
                className={cn(
                  "h-auto w-full flex-col items-start justify-start gap-1 border px-5 py-4 text-left text-sm",
                  borderRadiusClass,
                )}
              >
                <span className="font-medium">{suggestion.title}</span>
                <span className="text-muted-foreground">
                  {suggestion.label}
                </span>
              </Button>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>
      )}
    </div>
  );
};

interface ComposerProps {
  config: BuilderConfig;
  borderRadiusClass: string;
}

const Composer: FC<ComposerProps> = ({ config, borderRadiusClass }) => {
  const { components } = config;

  return (
    <div className="sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 bg-background pb-4">
      {components.scrollToBottom && <ThreadScrollToBottom />}
      <ComposerPrimitive.Root className="relative flex w-full flex-col">
        <div
          className={cn(
            "flex w-full flex-col border border-input bg-background px-1 pt-2 shadow-sm",
            borderRadiusClass,
          )}
        >
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-base outline-none placeholder:text-muted-foreground"
            rows={1}
            autoFocus
          />
          <div className="relative mx-1 mt-2 mb-2 flex items-center justify-between">
            {components.attachments ? (
              <ComposerPrimitive.AddAttachment asChild>
                <TooltipIconButton
                  tooltip="Add attachment"
                  variant="ghost"
                  className="text-muted-foreground"
                >
                  <PaperclipIcon className="size-5" />
                </TooltipIconButton>
              </ComposerPrimitive.AddAttachment>
            ) : (
              <div />
            )}

            <ThreadPrimitive.If running={false}>
              <ComposerPrimitive.Send asChild>
                <TooltipIconButton
                  tooltip="Send message"
                  variant="default"
                  className={cn("size-[34px] rounded-full p-1")}
                  style={{ backgroundColor: "var(--accent-color)" }}
                >
                  <ArrowUpIcon className="size-5 text-white" />
                </TooltipIconButton>
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>

            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="size-[34px] rounded-full"
                  style={{ backgroundColor: "var(--accent-color)" }}
                >
                  <Square className="size-3.5 fill-white text-white" />
                </Button>
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

interface UserMessageProps {
  config: BuilderConfig;
  borderRadiusClass: string;
}

const UserMessage: FC<UserMessageProps> = ({ config, borderRadiusClass }) => {
  const { components } = config;

  return (
    <MessagePrimitive.Root className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-4 [&:where(>*)]:col-start-2">
      <div className="relative col-start-2 min-w-0">
        <div
          className={cn(
            "bg-muted px-5 py-2.5 break-words text-foreground",
            borderRadiusClass,
          )}
        >
          <MessagePrimitive.Parts />
        </div>
        {components.editMessage && (
          <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
            <ActionBarPrimitive.Root
              hideWhenRunning
              autohide="not-last"
              className="flex flex-col items-end"
            >
              <ActionBarPrimitive.Edit asChild>
                <TooltipIconButton tooltip="Edit" className="p-4">
                  <PencilIcon />
                </TooltipIconButton>
              </ActionBarPrimitive.Edit>
            </ActionBarPrimitive.Root>
          </div>
        )}
      </div>

      {components.branchPicker && (
        <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      )}
    </MessagePrimitive.Root>
  );
};

interface AssistantMessageProps {
  config: BuilderConfig;
  borderRadiusClass: string;
}

const AssistantMessage: FC<AssistantMessageProps> = ({ config }) => {
  const { components } = config;

  return (
    <MessagePrimitive.Root className="relative mx-auto w-full max-w-[var(--thread-max-width)] py-4">
      <div className="mx-2 leading-7 break-words text-foreground">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>

      <div className="mt-2 ml-2 flex">
        {components.branchPicker && <BranchPicker />}
        <AssistantActionBar config={config} />
      </div>
    </MessagePrimitive.Root>
  );
};

interface AssistantActionBarProps {
  config: BuilderConfig;
}

const AssistantActionBar: FC<AssistantActionBarProps> = ({ config }) => {
  const { components } = config;
  const { actionBar } = components;

  if (!actionBar.copy && !actionBar.reload && !actionBar.speak) {
    return null;
  }

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="-ml-1 flex gap-1 text-muted-foreground"
    >
      {actionBar.copy && (
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip="Copy">
            <MessagePrimitive.If copied>
              <CheckIcon />
            </MessagePrimitive.If>
            <MessagePrimitive.If copied={false}>
              <CopyIcon />
            </MessagePrimitive.If>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
      )}
      {actionBar.reload && (
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip="Regenerate">
            <RefreshCwIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
      )}
      {actionBar.speak && (
        <ActionBarPrimitive.Speak asChild>
          <TooltipIconButton tooltip="Read aloud">
            <Volume2Icon />
          </TooltipIconButton>
        </ActionBarPrimitive.Speak>
      )}
    </ActionBarPrimitive.Root>
  );
};

interface BranchPickerProps {
  className?: string;
}

const BranchPicker: FC<BranchPickerProps> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
