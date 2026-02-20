"use client";

import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import * as Avatar from "@radix-ui/react-avatar";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import type { FC } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

export const ChatGPT: FC = () => {
  return (
    <ThreadPrimitive.Root className="dark flex h-full flex-col items-stretch bg-[#212121] px-4 text-foreground">
      <ThreadPrimitive.Viewport className="flex grow flex-col gap-8 overflow-y-scroll pt-16">
        <ThreadPrimitive.Empty>
          <div className="flex grow flex-col items-center justify-center">
            <Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/15 shadow">
              <Avatar.AvatarFallback>C</Avatar.AvatarFallback>
            </Avatar.Root>
            <p className="mt-4 text-white text-xl">How can I help you today?</p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end rounded-3xl bg-white/5 pl-2">
        <ComposerPrimitive.Input
          placeholder="Message ChatGPT"
          className="h-12 max-h-40 grow resize-none bg-transparent p-3.5 text-sm text-white outline-none placeholder:text-white/50"
        />
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send className="m-2 flex size-8 items-center justify-center rounded-full bg-white transition-opacity disabled:opacity-10">
            <ArrowUpIcon className="size-5 text-black [&_path]:stroke-1 [&_path]:stroke-black" />
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel className="m-2 flex size-8 items-center justify-center rounded-full bg-white">
            <div className="size-2.5 bg-black" />
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </ComposerPrimitive.Root>
      <p className="p-2 text-center text-[#cdcdcd] text-xs">
        ChatGPT can make mistakes. Check important info.
      </p>
    </ThreadPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl flex-col items-end gap-1">
      <div className="flex items-start gap-4">
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          autohideFloat="single-branch"
          className="mt-2"
        >
          <ActionBarPrimitive.Edit asChild>
            <TooltipIconButton tooltip="Edit" className="text-[#b4b4b4]">
              <Pencil1Icon />
            </TooltipIconButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <div className="rounded-3xl bg-white/5 px-5 py-2 text-[#eee]">
          <MessagePrimitive.Parts />
        </div>
      </div>

      <BranchPicker className="mt-2 mr-3" />
    </MessagePrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl flex-col justify-end gap-1 rounded-3xl bg-white/15">
      <ComposerPrimitive.Input className="flex h-8 w-full resize-none bg-transparent p-5 pb-0 text-white outline-none" />

      <div className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel className="rounded-full bg-zinc-900 px-3 py-2 font-semibold text-sm text-white hover:bg-zinc-800">
          Cancel
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="rounded-full bg-white px-3 py-2 font-semibold text-black text-sm hover:bg-white/90">
          Send
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl gap-3">
      <Avatar.Root className="flex size-8 shrink-0 items-center justify-center rounded-3xl border border-white/15 shadow">
        <Avatar.AvatarFallback className="text-white text-xs">
          C
        </Avatar.AvatarFallback>
      </Avatar.Root>

      <div className="pt-1">
        <div className="text-[#eee]">
          <MessagePrimitive.Parts />
        </div>

        <div className="flex pt-2">
          <BranchPicker />

          <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            autohideFloat="single-branch"
            className="flex items-center gap-1 rounded-lg data-floating:absolute data-floating:border-2 data-floating:p-1"
          >
            <ActionBarPrimitive.Reload asChild>
              <TooltipIconButton tooltip="Reload" className="text-[#b4b4b4]">
                <ReloadIcon />
              </TooltipIconButton>
            </ActionBarPrimitive.Reload>
            <ActionBarPrimitive.Copy asChild>
              <TooltipIconButton tooltip="Copy" className="text-[#b4b4b4]">
                <AuiIf condition={(s) => s.message.isCopied}>
                  <CheckIcon />
                </AuiIf>
                <AuiIf condition={(s) => !s.message.isCopied}>
                  <CopyIcon />
                </AuiIf>
              </TooltipIconButton>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "inline-flex items-center font-semibold text-[#b4b4b4] text-sm",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous" className="text-[#b4b4b4]">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next" className="text-[#b4b4b4]">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
