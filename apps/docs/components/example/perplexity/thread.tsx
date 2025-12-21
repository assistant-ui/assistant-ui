"use client";

import {
  ActionBarPrimitive,
  AssistantIf,
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
} from "@/components/assistant-ui/attachment-old";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="dark box-border h-full bg-[#1a1a1a] text-[#f5f5f5]"
      style={{
        ["--thread-max-width" as string]: "42rem",
      }}
    >
      <ThreadPrimitive.Empty>
        <ThreadWelcome />
      </ThreadPrimitive.Empty>
      <AssistantIf condition={({ thread }) => !thread.isEmpty}>
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
      </AssistantIf>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full border-[#3a3a3a] bg-[#242424] text-[#f5f5f5] hover:bg-[#3a3a3a] disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col gap-12">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <p className="font-display font-regular text-4xl text-[#f5f5f5] md:text-5xl">
            What do you want to know?
          </p>
        </div>
        <ComposerPrimitive.Root className="w-full rounded-xl border border-[#3a3a3a] bg-[#242424] px-2 shadow-sm outline-none transition-all duration-200 focus-within:border-[#20b8cd] focus-within:ring-1 focus-within:ring-[#20b8cd]/30">
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            placeholder="Ask anything..."
            className="max-h-40 w-full flex-grow resize-none border-none bg-transparent px-2 py-4 text-[#f5f5f5] text-lg outline-none placeholder:text-[#808080] focus:ring-0 disabled:cursor-not-allowed"
          />
          <div className="mx-1.5 flex gap-2">
            <div className="flex-grow" />
            <ComposerPrimitive.AddAttachment asChild>
              <TooltipIconButton
                className="my-2.5 size-8 rounded-max p-2 text-[#808080] transition-colors hover:text-[#f5f5f5]"
                tooltip="Add Attachment"
                variant="ghost"
              >
                <PaperclipIcon className="!size-4.5" />
              </TooltipIconButton>
            </ComposerPrimitive.AddAttachment>
            <ComposerPrimitive.Send asChild>
              <TooltipIconButton
                className="my-2.5 size-8 rounded-full bg-[#20b8cd] p-2 text-[#1a1a1a] transition-opacity hover:bg-[#1aa3b5]"
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
    <div className="w-full rounded-full bg-[#242424] p-2">
      <ComposerPrimitive.Root className="flex w-full flex-wrap items-end rounded-full border border-[#3a3a3a] bg-inherit px-2.5 shadow-sm transition-colors ease-in focus-within:border-[#20b8cd]/50">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          rows={1}
          autoFocus
          placeholder="Ask follow-up"
          className="max-h-40 flex-grow resize-none border-none bg-transparent px-4 py-4 text-[#f5f5f5] text-lg outline-none placeholder:text-[#808080] focus:ring-0 disabled:cursor-not-allowed"
        />
        <div className="flex gap-3">
          <ComposerPrimitive.AddAttachment asChild>
            <TooltipIconButton
              className="my-2.5 size-10 p-1 text-[#808080] transition-colors hover:text-[#f5f5f5]"
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
      <AssistantIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-10 rounded-full bg-[#20b8cd] p-2 text-[#1a1a1a] transition-colors hover:bg-[#1aa3b5]"
          >
            <ArrowUpIcon className="!size-5" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AssistantIf>
      <AssistantIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Cancel"
            variant="default"
            className="my-2.5 size-10 rounded-full bg-[#20b8cd] p-2 text-[#1a1a1a] transition-colors hover:bg-[#1aa3b5]"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </AssistantIf>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative w-full max-w-[var(--thread-max-width)] gap-y-2 py-4">
      <UserMessageAttachments />

      <div className="break-words rounded-3xl py-2.5 text-3xl text-[#f5f5f5]">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <div className="col-span-2 col-start-2 row-start-1 my-1.5 max-w-[calc(var(--thread-max-width)*0.8)] break-words text-[#e5e5e5] leading-7">
        <h1 className="mb-4 inline-flex items-center gap-2 text-2xl text-[#20b8cd]">
          <SparkleIcon /> Answer
        </h1>

        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>

      <AssistantActionBar />

      <BranchPicker className="col-start-2 row-start-2 mr-2 -ml-2" />
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="col-start-3 row-start-2 -ml-1 flex gap-1 text-[#808080]"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton
          tooltip="Copy"
          className="text-[#808080] hover:bg-[#3a3a3a] hover:text-[#f5f5f5]"
        >
          <AssistantIf condition={({ message }) => message.isCopied}>
            <CheckIcon className="text-[#20b8cd]" />
          </AssistantIf>
          <AssistantIf condition={({ message }) => !message.isCopied}>
            <CopyIcon />
          </AssistantIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton
          tooltip="Refresh"
          className="text-[#808080] hover:bg-[#3a3a3a] hover:text-[#f5f5f5]"
        >
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
        "inline-flex items-center text-[#808080] text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton
          tooltip="Previous"
          className="text-[#808080] hover:bg-[#3a3a3a] hover:text-[#f5f5f5]"
        >
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium text-[#a0a0a0]">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton
          tooltip="Next"
          className="text-[#808080] hover:bg-[#3a3a3a] hover:text-[#f5f5f5]"
        >
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
      aria-hidden="true"
    >
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};
