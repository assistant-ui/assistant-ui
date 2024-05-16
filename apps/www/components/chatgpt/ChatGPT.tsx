"use client";

import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  EditBarPrimitive,
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
import React, { type PropsWithChildren, type FC } from "react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export const ChatGPT: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="dark flex h-full flex-col items-stretch bg-[#212121]"
      style={{ colorScheme: "dark" }}
    >
      <ThreadPrimitive.Viewport className="flex flex-grow flex-col gap-8 overflow-y-scroll pt-16">
        <ThreadPrimitive.Empty>
          <div className="flex flex-grow flex-col items-center justify-center">
            <Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-white">
              <Avatar.AvatarFallback>C</Avatar.AvatarFallback>
            </Avatar.Root>
            <p className="mt-4 text-white text-xl">How can I help you today?</p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{ UserMessage, EditingUserMessage, AssistantMessage }}
        />
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="mx-auto flex w-full max-w-screen-md items-end rounded-3xl bg-white/5 pl-2">
        <ComposerPrimitive.Input
          placeholder="Message ChatGPT"
          className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm text-white outline-none placeholder:text-white/50"
        />
        <ThreadPrimitive.If busy={false}>
          <ComposerPrimitive.Send className="m-2 flex size-8 items-center justify-center rounded-full bg-white transition-opacity disabled:opacity-10">
            <ArrowUpIcon className="size-5 text-black [&_path]:stroke-[1] [&_path]:stroke-black" />
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If busy>
          <ComposerPrimitive.Stop className="m-2 flex size-8 items-center justify-center rounded-full bg-white">
            <div className="size-2.5 bg-black" />
          </ComposerPrimitive.Stop>
        </ThreadPrimitive.If>
      </ComposerPrimitive.Root>
      <p className="p-2 text-center text-[#cdcdcd] text-xs">
        ChatGPT can make mistakes. Check important info.
      </p>
    </ThreadPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-screen-md flex-col items-end gap-1">
      <div className="flex items-start gap-2">
        <ActionBarPrimitive.Root className="m-2">
          <ActionBarPrimitive.Edit asChild>
            <ActionBarButton tooltip="Edit">
              <Pencil1Icon />
            </ActionBarButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <p className="whitespace-pre-line rounded-3xl bg-white/5 px-5 py-2 text-[#eee]">
          <MessagePrimitive.Content />
        </p>
      </div>

      <BranchPicker className="mt-2 mr-4" />
    </MessagePrimitive.Root>
  );
};

const EditingUserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-screen-md flex-col justify-end gap-1 rounded-3xl bg-white/15">
      <MessagePrimitive.EditableContent className="flex h-8 w-full resize-none bg-transparent p-5 pb-0 text-white outline-none" />

      <EditBarPrimitive.Root className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <EditBarPrimitive.Cancel className="rounded-full bg-zinc-900 px-3 py-2 font-semibold text-sm text-white hover:bg-zinc-800">
          Cancel
        </EditBarPrimitive.Cancel>
        <EditBarPrimitive.Save className="rounded-full bg-white px-3 py-2 font-semibold text-black text-sm hover:bg-white/90">
          Send
        </EditBarPrimitive.Save>
      </EditBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-screen-md gap-3">
      <Avatar.Root className="flex size-8 flex-shrink-0 items-center justify-center rounded-[24px] border border-white/15 shadow">
        <Avatar.AvatarFallback className="text-white text-xs">
          C
        </Avatar.AvatarFallback>
      </Avatar.Root>

      <div className="pt-1">
        <p className="whitespace-pre-line text-[#eee]">
          <MessagePrimitive.Content />
        </p>

        <ActionBarPrimitive.Root className="mt-2 flex items-center gap-1">
          <BranchPicker />

          <ActionBarPrimitive.Reload asChild>
            <ActionBarButton tooltip="Reload">
              <ReloadIcon />
            </ActionBarButton>
          </ActionBarPrimitive.Reload>
          <ActionBarPrimitive.Copy asChild>
            <ActionBarButton tooltip="Copy">
              <MessagePrimitive.If copied>
                <CheckIcon />
              </MessagePrimitive.If>
              <MessagePrimitive.If copied={false}>
                <CopyIcon />
              </MessagePrimitive.If>
            </ActionBarButton>
          </ActionBarPrimitive.Copy>
        </ActionBarPrimitive.Root>
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
        <ActionBarButton tooltip="Previous">
          <ChevronLeftIcon />
        </ActionBarButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <ActionBarButton tooltip="Next">
          <ChevronRightIcon />
        </ActionBarButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

type ActionBarButtonProps = PropsWithChildren<{ tooltip: string }>;

const ActionBarButton: FC<ActionBarButtonProps> = ({
  children,
  tooltip,
  ...rest
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={"ghost"}
          size="icon"
          className="size-auto p-1 text-[#b4b4b4] transition-colors hover:text-white"
          {...rest}
        >
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>

      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
};
