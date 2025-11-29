"use client";

import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import * as Avatar from "@radix-ui/react-avatar";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
  MixerHorizontalIcon,
  Pencil1Icon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { FC } from "react";
import { MarkdownText } from "../assistant-ui/markdown-text";

export const Claude: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#2b2a27] px-4 pt-16 font-serif">
      <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-scroll">
        <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
        <div aria-hidden="true" className="h-12" />
        <ThreadPrimitive.If empty={false}>
          <p className="mx-auto w-full max-w-3xl p-2 text-right text-[#b8b5a9] text-xs">
            Claude can make mistakes. Please double-check responses.
          </p>
        </ThreadPrimitive.If>
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-transparent bg-[#1f1e1b] p-0.5 shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.15)] transition-shadow duration-200 focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(108,106,96,0.3)] hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.3)]">
        <div className="m-3.5 flex flex-col gap-3.5">
          <div className="relative">
            <div className="wrap-break-word max-h-96 w-full overflow-y-auto">
              <ComposerPrimitive.Input
                placeholder="How can I help you today?"
                className="block min-h-6 w-full resize-none bg-transparent text-[#eee] outline-none placeholder:text-[#9a9893]"
              />
            </div>
          </div>
          <div className="flex w-full items-center gap-2">
            <div className="relative flex min-w-0 flex-1 shrink items-center gap-2">
              <ComposerPrimitive.AddAttachment className="flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-lg border border-[#6c6a6040] bg-transparent px-1.5 text-[#9a9893] transition-all hover:bg-[#393937] hover:text-[#eee] active:scale-[0.98]">
                <PlusIcon width={16} height={16} />
              </ComposerPrimitive.AddAttachment>
              <button
                type="button"
                className="flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-lg border border-[#6c6a6040] bg-transparent px-1.5 text-[#9a9893] transition-all hover:bg-[#393937] hover:text-[#eee] active:scale-[0.98]"
                aria-label="Open tools menu"
              >
                <MixerHorizontalIcon width={16} height={16} />
              </button>
              <button
                type="button"
                className="flex h-8 min-w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#6c6a6040] bg-transparent px-1.5 text-[#9a9893] transition-all hover:bg-[#393937] hover:text-[#eee] active:scale-[0.98]"
                aria-label="Extended thinking"
              >
                <ReloadIcon width={16} height={16} />
              </button>
            </div>
            <button
              type="button"
              className="flex h-8 min-w-16 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 pr-2 pl-2.5 text-[#eee] text-xs transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-[#393937] active:scale-[0.985]"
            >
              <span className="font-serif text-[14px]">Sonnet 4.5</span>
              <ChevronDownIcon width={20} height={20} className="opacity-75" />
            </button>
            <ComposerPrimitive.Send className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ae5630] transition-colors hover:bg-[#c4633a] active:scale-95 disabled:pointer-events-none disabled:opacity-50">
              <ArrowUpIcon width={16} height={16} className="text-white" />
            </ComposerPrimitive.Send>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group relative mt-1 mb-1">
      <MessagePrimitive.If user>
        <div className="wrap-break-word relative inline-flex max-w-[75ch] rounded-xl bg-[#393937] py-2.5 pr-6 pl-2.5 text-[#eee] transition-all">
          <div className="relative flex flex-row gap-2">
            <Avatar.Root className="flex h-7 w-7 shrink-0 select-none items-center justify-center self-start rounded-full bg-[#eee] font-bold text-[#2b2a27] text-[12px]">
              <Avatar.AvatarFallback>U</Avatar.AvatarFallback>
            </Avatar.Root>
            <div className="flex-1">
              <div className="relative grid grid-cols-1 gap-2 py-0.5">
                <div className="wrap-break-word whitespace-pre-wrap">
                  <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute right-2 bottom-0">
            <ActionBarPrimitive.Root
              autohide="not-last"
              className="pointer-events-auto min-w-max translate-x-1 translate-y-4 rounded-lg border border-[#6c6a6040] bg-[#1f1e1b]/80 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition group-hover:translate-x-0.5 group-hover:opacity-100"
            >
              <div className="flex items-center text-[#9a9893]">
                <ActionBarPrimitive.Reload className="flex h-8 w-8 items-center justify-center rounded-md transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-transparent active:scale-95">
                  <ReloadIcon width={20} height={20} />
                </ActionBarPrimitive.Reload>
                <ActionBarPrimitive.Edit className="flex h-8 w-8 items-center justify-center rounded-md transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-transparent active:scale-95">
                  <Pencil1Icon width={20} height={20} />
                </ActionBarPrimitive.Edit>
              </div>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </MessagePrimitive.If>

      <MessagePrimitive.If assistant>
        <div className="relative pb-3 font-serif">
          <div className="relative leading-[1.65rem]">
            <div className="grid grid-cols-1 gap-2.5">
              <div className="wrap-break-word whitespace-normal pr-8 pl-2 font-serif text-[#eee]">
                <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute right-2 bottom-0">
            <ActionBarPrimitive.Root
              autohide="not-last"
              className="pointer-events-auto min-w-max translate-x-2 translate-y-full rounded-lg pt-2 transition"
            >
              <div className="flex items-stretch justify-between text-[#9a9893]">
                <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-md transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-transparent active:scale-95">
                  <ClipboardIcon width={20} height={20} />
                </ActionBarPrimitive.Copy>
                <ActionBarPrimitive.FeedbackPositive className="flex h-8 w-8 items-center justify-center rounded-md transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-transparent active:scale-95">
                  <ThumbsUp width={16} height={16} />
                </ActionBarPrimitive.FeedbackPositive>
                <ActionBarPrimitive.FeedbackNegative className="flex h-8 w-8 items-center justify-center rounded-md transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-transparent active:scale-95">
                  <ThumbsDown width={16} height={16} />
                </ActionBarPrimitive.FeedbackNegative>
                <ActionBarPrimitive.Reload className="flex h-8 w-8 items-center justify-center rounded-md transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-transparent active:scale-95">
                  <ReloadIcon width={20} height={20} />
                </ActionBarPrimitive.Reload>
              </div>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
};
