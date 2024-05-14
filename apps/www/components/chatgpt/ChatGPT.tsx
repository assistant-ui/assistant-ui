"use client";

import React, { type FC } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  EditBarPrimitive,
} from "@assistant-ui/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ClipboardIcon,
  Pencil1Icon,
  ReloadIcon,
  CheckIcon,
} from "@radix-ui/react-icons";

export const ChatGPT: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#212121] px-12 pb-4">
      <ThreadPrimitive.Viewport className="flex flex-grow flex-col overflow-y-scroll pt-16">
        <ThreadPrimitive.Empty>
          <div className="flex flex-grow flex-col items-center justify-center">
            <Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-white">
              <Avatar.AvatarFallback>C</Avatar.AvatarFallback>
            </Avatar.Root>
            <p className="mt-4 text-white text-xl">How can I help you today?</p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="flex items-end rounded-xl border border-white/15 p-0.5">
        <ComposerPrimitive.Input
          placeholder="Message ChatGPT..."
          className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm text-white outline-none placeholder:text-white/50"
        />
        <ThreadPrimitive.If busy={false}>
          <ComposerPrimitive.Send className="m-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-2xl disabled:opacity-10">
            <ArrowUpIcon
              width={20}
              height={20}
              className="[&_path]:stroke-[0.5] [&_path]:stroke-black"
            />
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If busy>
          <ComposerPrimitive.Stop className="m-3.5 flex size-5 items-center justify-center rounded-full border-2 border-whtie font-bold text-white">
            <div className="size-2 rounded-[1px] bg-white" />
          </ComposerPrimitive.Stop>
        </ThreadPrimitive.If>
      </ComposerPrimitive.Root>
      <p className="p-2 text-center text-[#cdcdcd] text-xs">
        ChatGPT can make mistakes. Consider checking important information.
      </p>
    </ThreadPrimitive.Root>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-12 flex gap-3">
      <Avatar.Root className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[24px] bg-white">
        <Avatar.AvatarFallback className="text-xs">
          <MessagePrimitive.If user>Y</MessagePrimitive.If>
          <MessagePrimitive.If assistant>C</MessagePrimitive.If>
        </Avatar.AvatarFallback>
      </Avatar.Root>

      <div className="flex-grow">
        <p className="font-semibold text-white">
          <MessagePrimitive.If user>You</MessagePrimitive.If>
          <MessagePrimitive.If assistant>ChatGPT</MessagePrimitive.If>
        </p>

        <MessagePrimitive.If editing={false}>
          <p className="whitespace-pre-line text-[#eee]">
            <MessagePrimitive.Content />
          </p>
        </MessagePrimitive.If>

        <MessagePrimitive.If editing>
          <MessagePrimitive.EditableContent className="flex h-8 w-full resize-none bg-transparent text-white outline-none" />
        </MessagePrimitive.If>

        <MessagePrimitive.If editing={false}>
          <ActionBarPrimitive.Root className="mt-2 flex items-center gap-3">
            <MessagePrimitive.If hasBranches>
              <BranchPickerPrimitive.Root className="inline-flex text-[#b4b4b4] text-xs">
                <BranchPickerPrimitive.Previous className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                  <ChevronLeftIcon />
                </BranchPickerPrimitive.Previous>
                <BranchPickerPrimitive.Number /> /{" "}
                <BranchPickerPrimitive.Count />
                <BranchPickerPrimitive.Next className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                  <ChevronRightIcon />
                </BranchPickerPrimitive.Next>
              </BranchPickerPrimitive.Root>
            </MessagePrimitive.If>

            <MessagePrimitive.If assistant>
              <ActionBarPrimitive.Reload className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <ReloadIcon />
              </ActionBarPrimitive.Reload>
              <ActionBarPrimitive.Copy className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <MessagePrimitive.If copied>
                  <CheckIcon />
                </MessagePrimitive.If>
                <MessagePrimitive.If copied={false}>
                  <ClipboardIcon />
                </MessagePrimitive.If>
              </ActionBarPrimitive.Copy>
            </MessagePrimitive.If>

            <MessagePrimitive.If user>
              <ActionBarPrimitive.Edit className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <Pencil1Icon />
              </ActionBarPrimitive.Edit>
            </MessagePrimitive.If>
          </ActionBarPrimitive.Root>
        </MessagePrimitive.If>

        <MessagePrimitive.If editing>
          <EditBarPrimitive.Root className="mt-2 flex items-center justify-center gap-3">
            <EditBarPrimitive.Save className="rounded-lg bg-[#10a37e] px-3 py-2 text-sm text-white hover:bg-[#1a7f64]">
              Save & Submit
            </EditBarPrimitive.Save>

            <EditBarPrimitive.Cancel className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-800">
              Cancel
            </EditBarPrimitive.Cancel>
          </EditBarPrimitive.Root>
        </MessagePrimitive.If>
      </div>
    </MessagePrimitive.Root>
  );
};
