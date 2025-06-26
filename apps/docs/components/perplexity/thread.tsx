"use client";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SparkleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="box-border h-full bg-[#191a1a]"
      style={{
        ["--thread-max-width" as string]: "42rem",
      }}
    >
      <ThreadPrimitive.Empty>
        <ThreadWelcome />
      </ThreadPrimitive.Empty>
      <ThreadPrimitive.If empty={false}>
        <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth bg-inherit px-4 pt-8">
          <ThreadPrimitive.Messages
            components={{
              UserMessage: UserMessage,
              AssistantMessage: AssistantMessage,
            }}
          />

          <div className="min-h-8 flex-grow" />

          <div className="sticky bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-inherit pb-4">
            <ThreadScrollToBottom />
            <Composer />
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.If>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col gap-12">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <p className="font-regular font-display text-4xl md:text-5xl">
            What do you want to know?
          </p>
        </div>
        <ComposerPrimitive.Root className="focus-within:ring-border w-full rounded-lg border bg-[#202222] px-2 shadow-sm outline-none transition-all duration-200 focus-within:ring-1 focus:outline-none">
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            placeholder="Ask anything..."
            className="placeholder:text-muted-foreground max-h-40 w-full flex-grow resize-none border-none bg-transparent px-2 py-4 text-lg outline-none focus:ring-0 disabled:cursor-not-allowed"
          />
          <div className="mx-1.5 flex gap-2">
            <div className="flex-grow" />
            <ComposerPrimitive.AddAttachment asChild>
              <TooltipIconButton
                className="rounded-max text-muted-foreground my-2.5 size-8 p-2 transition-opacity ease-in"
                tooltip="Add Attachment"
                variant="ghost"
              >
                <PaperclipIcon className="!size-4.5" />
              </TooltipIconButton>
            </ComposerPrimitive.AddAttachment>
            <ComposerPrimitive.Send asChild>
              <TooltipIconButton
                className="my-2.5 size-8 rounded-full p-2 transition-opacity"
                tooltip="Send"
                variant="default"
              >
                <ArrowRightIcon />
              </TooltipIconButton>
            </ComposerPrimitive.Send>
          </div>
        </ComposerPrimitive.Root>
      </div>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <div className="bg-foreground/5 w-full rounded-full p-2">
      <ComposerPrimitive.Root className="focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-full border bg-inherit px-2.5 shadow-sm transition-colors ease-in">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          rows={1}
          autoFocus
          placeholder="Ask follow-up"
          className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-4 py-4 text-lg outline-none focus:ring-0 disabled:cursor-not-allowed"
        />
        <div className="flex gap-3">
          <ComposerPrimitive.AddAttachment asChild>
            <TooltipIconButton
              className="text-muted-foreground my-2.5 size-10 p-1 transition-opacity ease-in"
              tooltip="Add Attachment"
              variant="ghost"
            >
              <PaperclipIcon className="!size-6" />
            </TooltipIconButton>
          </ComposerPrimitive.AddAttachment>
          <ComposerAction />
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const ComposerAction: FC = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-10 rounded-full p-2 transition-opacity ease-in"
          >
            <ArrowUpIcon className="!size-5" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Cancel"
            variant="default"
            className="my-2.5 size-10 rounded-full p-2 transition-opacity ease-in"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative w-full max-w-[var(--thread-max-width)] gap-y-2 py-4">
      <UserMessageAttachments />

      <div className="text-foreground break-words rounded-3xl py-2.5 text-3xl">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <div className="text-foreground col-span-2 col-start-2 row-start-1 my-1.5 max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7">
        <h1 className="mb-4 inline-flex items-center gap-2 text-2xl">
          <SparkleIcon /> Answer
        </h1>

        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>

      <AssistantActionBar />

      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-muted-foreground col-start-3 row-start-2 -ml-1 flex gap-1"
    >
      {/* <MessagePrimitive.If speaking={false}>
        <ActionBarPrimitive.Speak asChild>
          <TooltipIconButton tooltip="Read aloud">
            <AudioLinesIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Speak>
      </MessagePrimitive.If>
      <MessagePrimitive.If speaking>
        <ActionBarPrimitive.StopSpeaking asChild>
          <TooltipIconButton tooltip="Stop">
            <StopCircleIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.StopSpeaking>
      </MessagePrimitive.If> */}
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
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "text-muted-foreground inline-flex items-center text-xs",
        className,
      )}
      {...rest}
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

const CircleStopIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      width="16"
      height="16"
    >
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};
