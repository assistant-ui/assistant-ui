"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import * as Avatar from "@radix-ui/react-avatar";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
  Cross2Icon,
  MixerHorizontalIcon,
  Pencil1Icon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useShallow } from "zustand/shallow";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";

export const Claude: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#F5F5F0] p-4 pt-16 font-serif dark:bg-[#2b2a27]">
      <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-scroll">
        <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
        <div aria-hidden="true" className="h-4" />
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-transparent bg-white p-0.5 shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(0,0,0,0.08)] transition-shadow duration-200 focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075),0_0_0_0.5px_rgba(0,0,0,0.15)] hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05),0_0_0_0.5px_rgba(0,0,0,0.12)] dark:bg-[#1f1e1b] dark:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.15)] dark:hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.3)] dark:focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(108,106,96,0.3)]">
        <div className="m-3.5 flex flex-col gap-3.5">
          <div className="relative">
            <div className="wrap-break-word max-h-96 w-full overflow-y-auto">
              <ComposerPrimitive.Input
                placeholder="How can I help you today?"
                className="block min-h-6 w-full resize-none bg-transparent text-[#1a1a18] outline-none placeholder:text-[#9a9893] dark:text-[#eee] dark:placeholder:text-[#9a9893]"
              />
            </div>
          </div>
          <div className="flex w-full items-center gap-2">
            <div className="relative flex min-w-0 flex-1 shrink items-center gap-2">
              <ComposerPrimitive.AddAttachment className="flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-lg border border-[#00000015] bg-transparent px-1.5 text-[#6b6a68] transition-all hover:bg-[#f5f5f0] hover:text-[#1a1a18] active:scale-[0.98] dark:border-[#6c6a6040] dark:text-[#9a9893] dark:hover:bg-[#393937] dark:hover:text-[#eee]">
                <PlusIcon width={16} height={16} />
              </ComposerPrimitive.AddAttachment>
              <button
                type="button"
                className="flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-lg border border-[#00000015] bg-transparent px-1.5 text-[#6b6a68] transition-all hover:bg-[#f5f5f0] hover:text-[#1a1a18] active:scale-[0.98] dark:border-[#6c6a6040] dark:text-[#9a9893] dark:hover:bg-[#393937] dark:hover:text-[#eee]"
                aria-label="Open tools menu"
              >
                <MixerHorizontalIcon width={16} height={16} />
              </button>
              <button
                type="button"
                className="flex h-8 min-w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#00000015] bg-transparent px-1.5 text-[#6b6a68] transition-all hover:bg-[#f5f5f0] hover:text-[#1a1a18] active:scale-[0.98] dark:border-[#6c6a6040] dark:text-[#9a9893] dark:hover:bg-[#393937] dark:hover:text-[#eee]"
                aria-label="Extended thinking"
              >
                <ReloadIcon width={16} height={16} />
              </button>
            </div>
            <button
              type="button"
              className="flex h-8 min-w-16 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 pr-2 pl-2.5 text-[#1a1a18] text-xs transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-[#f5f5f0] active:scale-[0.985] dark:text-[#eee] dark:hover:bg-[#393937]"
            >
              <span className="font-serif text-[14px]">Sonnet 4.5</span>
              <ChevronDownIcon width={20} height={20} className="opacity-75" />
            </button>
            <ComposerPrimitive.Send className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ae5630] transition-colors hover:bg-[#c4633a] active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:bg-[#ae5630] dark:hover:bg-[#c4633a]">
              <ArrowUpIcon width={16} height={16} className="text-white" />
            </ComposerPrimitive.Send>
          </div>
        </div>
        <AuiIf condition={(s) => s.composer.attachments.length > 0}>
          <div className="overflow-hidden rounded-b-2xl">
            <div className="overflow-x-auto rounded-b-2xl border-[#00000015] border-t bg-[#f5f5f0] p-3.5 dark:border-[#6c6a6040] dark:bg-[#393937]">
              <div className="flex flex-row gap-3">
                <ComposerPrimitive.Attachments
                  components={{ Attachment: ClaudeAttachment }}
                />
              </div>
            </div>
          </div>
        </AuiIf>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group relative mx-auto mt-1 mb-1 block w-full max-w-3xl">
      <AuiIf condition={({ message }) => message.role === "user"}>
        <div className="group/user wrap-break-word relative inline-flex max-w-[75ch] flex-col gap-2 rounded-xl bg-[#DDD9CE] py-2.5 pr-6 pl-2.5 text-[#1a1a18] transition-all dark:bg-[#393937] dark:text-[#eee]">
          <div className="relative flex flex-row gap-2">
            <div className="shrink-0 self-start transition-all duration-300">
              <Avatar.Root className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-[#1a1a18] font-bold text-[12px] text-white dark:bg-[#eee] dark:text-[#2b2a27]">
                <Avatar.AvatarFallback>U</Avatar.AvatarFallback>
              </Avatar.Root>
            </div>
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
              className="pointer-events-auto min-w-max translate-x-1 translate-y-4 rounded-lg border-[#00000015] border-[0.5px] bg-white/80 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition group-hover/user:translate-x-0.5 group-hover/user:opacity-100 dark:border-[#6c6a6040] dark:bg-[#1f1e1b]/80"
            >
              <div className="flex items-center text-[#6b6a68] dark:text-[#9a9893]">
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
      </AuiIf>

      <AuiIf condition={({ message }) => message.role === "assistant"}>
        <div className="relative mb-12 font-serif">
          <div className="relative leading-[1.65rem]">
            <div className="grid grid-cols-1 gap-2.5">
              <div className="wrap-break-word whitespace-normal pr-8 pl-2 font-serif text-[#1a1a18] dark:text-[#eee]">
                <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <ActionBarPrimitive.Root
              hideWhenRunning
              autohide="not-last"
              className="pointer-events-auto flex w-full translate-y-full flex-col items-end px-2 pt-2 transition"
            >
              <div className="flex items-center text-[#6b6a68] dark:text-[#9a9893]">
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
              <AuiIf condition={({ message }) => message.isLast}>
                <p className="mt-2 w-full text-right text-[#8a8985] text-[0.65rem] leading-[0.85rem] opacity-90 sm:text-[0.75rem] dark:text-[#b8b5a9]">
                  Claude can make mistakes. Please double-check responses.
                </p>
              </AuiIf>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AuiIf>
    </MessagePrimitive.Root>
  );
};

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const src = s.attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

const ClaudeAttachment: FC = () => {
  const isImage = useAuiState((s) => s.attachment.type === "image");
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/thumbnail relative">
      <div
        className="can-focus-within overflow-hidden rounded-lg border border-[#00000020] shadow-sm hover:border-[#00000040] hover:shadow-md dark:border-[#6c6a6040] dark:hover:border-[#6c6a6080]"
        style={{
          width: "120px",
          height: "120px",
          minWidth: "120px",
          minHeight: "120px",
        }}
      >
        <button
          type="button"
          className="relative bg-white dark:bg-[#2b2a27]"
          style={{ width: "120px", height: "120px" }}
        >
          {isImage && src ? (
            <img
              className="h-full w-full object-cover opacity-100 transition duration-400"
              alt="Attachment"
              src={src}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#6b6a68] dark:text-[#9a9893]">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </button>
      </div>
      <AttachmentPrimitive.Remove
        className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#00000020] bg-white/90 text-[#6b6a68] opacity-0 backdrop-blur-sm transition-all hover:bg-white hover:text-[#1a1a18] group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100 dark:border-[#6c6a6040] dark:bg-[#1f1e1b]/90 dark:text-[#9a9893] dark:hover:bg-[#1f1e1b] dark:hover:text-[#eee]"
        aria-label="Remove attachment"
      >
        <Cross2Icon width={12} height={12} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};
