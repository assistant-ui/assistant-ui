"use client";

import React, { FC } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import {
  Thread,
  Message,
  Composer,
  ActionBar,
  BranchPicker,
  EditBar,
} from "assistant-ui";
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
    <Thread.Root className="flex h-full flex-col items-stretch bg-[#212121] px-12 pb-4">
      <Thread.Viewport className="flex flex-grow flex-col overflow-y-scroll pt-16">
        <Thread.Empty>
          <div className="flex flex-grow flex-col items-center justify-center">
            <Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-white">
              <Avatar.AvatarFallback>C</Avatar.AvatarFallback>
            </Avatar.Root>
            <p className="mt-4 text-xl text-white">How can I help you today?</p>
          </div>
        </Thread.Empty>

        <Thread.Messages components={{ Message: ChatMessage }} />
      </Thread.Viewport>

      <Composer.Root className="flex items-end rounded-xl border border-white/15 p-0.5">
        <Composer.Input
          placeholder="Message ChatGPT..."
          className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm text-white outline-none placeholder:text-white/50"
        />
        <Thread.If busy={false}>
          <Composer.Send className="m-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-2xl font-bold disabled:opacity-10">
            <ArrowUpIcon
              width={20}
              height={20}
              className="[&_path]:stroke-black [&_path]:stroke-[0.5]"
            />
          </Composer.Send>
        </Thread.If>
        <Thread.If busy>
          <Composer.Stop className="border-whtie m-3.5 flex size-5 items-center justify-center rounded-full border-2 font-bold text-white">
            <div className="size-2 rounded-[1px] bg-white" />
          </Composer.Stop>
        </Thread.If>
      </Composer.Root>
      <p className="p-2 text-center text-xs text-[#cdcdcd]">
        ChatGPT can make mistakes. Consider checking important information.
      </p>
    </Thread.Root>
  );
};

const ChatMessage: FC = () => {
  return (
    <Message.Root className="mb-12 flex gap-3">
      <Avatar.Root className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[24px] bg-white">
        <Avatar.AvatarFallback className="text-xs">
          <Message.If user>Y</Message.If>
          <Message.If assistant>C</Message.If>
        </Avatar.AvatarFallback>
      </Avatar.Root>

      <div className="flex-grow">
        <p className="font-semibold text-white">
          <Message.If user>You</Message.If>
          <Message.If assistant>ChatGPT</Message.If>
        </p>

        <Message.If editing={false}>
          <p className="whitespace-pre-line text-[#eee]">
            <Message.PlaintextContent />
          </p>
        </Message.If>

        <Message.If editing>
          <Message.EditableContent className="flex h-8 w-full resize-none bg-transparent text-white outline-none" />
        </Message.If>

        <Message.If editing={false}>
          <ActionBar.Root className="mt-2 flex items-center gap-3">
            <Message.If hasBranches>
              <BranchPicker.Root className="inline-flex text-xs text-[#b4b4b4]">
                <BranchPicker.Previous className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                  <ChevronLeftIcon />
                </BranchPicker.Previous>
                <BranchPicker.Number /> / <BranchPicker.Count />
                <BranchPicker.Next className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                  <ChevronRightIcon />
                </BranchPicker.Next>
              </BranchPicker.Root>
            </Message.If>

            <Message.If assistant>
              <ActionBar.Reload className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <ReloadIcon />
              </ActionBar.Reload>
              <ActionBar.Copy className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <Message.If copied>
                  <CheckIcon />
                </Message.If>
                <Message.If copied={false}>
                  <ClipboardIcon />
                </Message.If>
              </ActionBar.Copy>
            </Message.If>

            <Message.If user>
              <ActionBar.Edit className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <Pencil1Icon />
              </ActionBar.Edit>
            </Message.If>
          </ActionBar.Root>
        </Message.If>

        <Message.If editing>
          <EditBar.Root className="mt-2 flex items-center justify-center gap-3">
            <EditBar.Save className="rounded-lg bg-[#10a37e] px-3 py-2 text-sm text-white hover:bg-[#1a7f64]">
              Save & Submit
            </EditBar.Save>

            <EditBar.Cancel className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-800">
              Cancel
            </EditBar.Cancel>
          </EditBar.Root>
        </Message.If>
      </div>
    </Message.Root>
  );
};
