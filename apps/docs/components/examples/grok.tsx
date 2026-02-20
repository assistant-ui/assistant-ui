"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useMessageTiming,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CopyIcon,
  Cross2Icon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  Mic,
  Moon,
  Paperclip,
  Square,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useShallow } from "zustand/shallow";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { GrokIcon } from "@/components/icons/grok";

export const Grok: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#fdfdfd] px-4 dark:bg-[#141414]">
      <ThreadPrimitive.Empty>
        <div className="flex h-full flex-col items-center justify-center">
          <GrokIcon className="mb-6 h-10 text-[#0d0d0d] dark:text-white" />
          <Composer />
        </div>
      </ThreadPrimitive.Empty>

      <AuiIf condition={(s) => s.thread.isEmpty === false}>
        <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-scroll pt-16">
          <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
        </ThreadPrimitive.Viewport>
        <Composer />
        <p className="mx-auto w-full max-w-3xl pb-2 text-center text-[#9a9a9a] text-xs">
          Grok can make mistakes. Verify important information.
        </p>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

const Composer: FC = () => {
  const isEmpty = useAuiState((s) => s.composer.isEmpty);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root
      className="group/composer mx-auto mb-3 w-full max-w-3xl"
      data-empty={isEmpty}
      data-running={isRunning}
    >
      <div className="overflow-hidden rounded-4xl bg-[#f8f8f8] shadow-xs ring-1 ring-[#e5e5e5] ring-inset transition-shadow focus-within:ring-[#d0d0d0] dark:bg-[#212121] dark:ring-[#2a2a2a] dark:focus-within:ring-[#3a3a3a]">
        <AuiIf condition={(s) => s.composer.attachments.length > 0}>
          <div className="flex flex-row flex-wrap gap-2 px-4 pt-3">
            <ComposerPrimitive.Attachments
              components={{ Attachment: GrokAttachment }}
            />
          </div>
        </AuiIf>

        <div className="flex items-end gap-1 p-2">
          <ComposerPrimitive.AddAttachment className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0d0d0d] transition-colors hover:bg-[#f0f0f0] dark:text-white dark:hover:bg-[#2a2a2a]">
            <Paperclip width={18} height={18} />
          </ComposerPrimitive.AddAttachment>

          <ComposerPrimitive.Input
            placeholder="What do you want to know?"
            minRows={1}
            className="my-2 h-6 max-h-100 min-w-0 flex-1 resize-none bg-transparent text-[#0d0d0d] text-base leading-6 outline-none placeholder:text-[#9a9a9a] dark:text-white dark:placeholder:text-[#6b6b6b]"
          />

          <button
            type="button"
            className="mb-0.5 flex h-9 shrink-0 items-center gap-2 rounded-full px-2.5 text-[#0d0d0d] hover:bg-[#f0f0f0] dark:text-white dark:hover:bg-[#2a2a2a]"
          >
            <Moon width={18} height={18} className="shrink-0" />
            <div className="flex items-center gap-1 overflow-hidden transition-[max-width,opacity] duration-300 group-data-[empty=false]/composer:max-w-0 group-data-[empty=true]/composer:max-w-24 group-data-[empty=false]/composer:opacity-0 group-data-[empty=true]/composer:opacity-100">
              <span className="whitespace-nowrap font-semibold text-sm">
                Grok 4.1
              </span>
              <ChevronDownIcon width={16} height={16} className="shrink-0" />
            </div>
          </button>

          <div className="relative mb-0.5 h-9 w-9 shrink-0 rounded-full bg-[#0d0d0d] text-white dark:bg-white dark:text-[#0d0d0d]">
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[empty=false]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=false]/composer:opacity-0 group-data-[running=true]/composer:opacity-0"
              aria-label="Voice mode"
            >
              <Mic width={18} height={18} />
            </button>

            <ComposerPrimitive.Send className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[empty=true]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 group-data-[running=true]/composer:opacity-0">
              <ArrowUpIcon width={18} height={18} />
            </ComposerPrimitive.Send>

            <ComposerPrimitive.Cancel className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0">
              <Square width={14} height={14} fill="currentColor" />
            </ComposerPrimitive.Cancel>
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message relative mx-auto mb-2 flex w-full max-w-3xl flex-col pb-0.5">
      <AuiIf condition={(s) => s.message.role === "user"}>
        <div className="flex flex-col items-end">
          <div className="relative max-w-[90%] rounded-3xl rounded-br-lg border border-[#e5e5e5] bg-[#f0f0f0] px-4 py-3 text-[#0d0d0d] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-white">
            <div className="prose prose-sm dark:prose-invert wrap-break-word prose-p:my-0">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>
          </div>
          <div className="mt-1 flex h-8 items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Root className="flex items-center gap-0.5">
              <ActionBarPrimitive.Edit className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <Pencil1Icon width={16} height={16} />
              </ActionBarPrimitive.Edit>
              <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <CopyIcon width={16} height={16} />
              </ActionBarPrimitive.Copy>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AuiIf>

      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex flex-col items-start">
          <div className="w-full max-w-none">
            <div className="prose prose-sm wrap-break-word dark:prose-invert prose-li:my-1 prose-ol:my-1 prose-p:my-2 prose-ul:my-1 text-[#0d0d0d] dark:text-[#e5e5e5]">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>
          </div>
          <div className="mt-1 flex h-8 w-full items-center justify-start gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Root className="-ml-2 flex items-center gap-0.5">
              <ActionBarPrimitive.Reload className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ReloadIcon width={16} height={16} />
              </ActionBarPrimitive.Reload>
              <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <CopyIcon width={16} height={16} />
              </ActionBarPrimitive.Copy>
              <ActionBarPrimitive.FeedbackPositive className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ThumbsUp width={16} height={16} />
              </ActionBarPrimitive.FeedbackPositive>
              <ActionBarPrimitive.FeedbackNegative className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ThumbsDown width={16} height={16} />
              </ActionBarPrimitive.FeedbackNegative>
              <MessageTimingDisplay />
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AuiIf>
    </MessagePrimitive.Root>
  );
};

const formatTime = (ms: number | undefined) => {
  if (ms === undefined) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatMs = (ms: number | undefined) => {
  if (ms === undefined) return "\u2014";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const MessageTimingDisplay: FC = () => {
  const timing = useMessageTiming();
  if (!timing?.totalStreamTime) return null;

  const totalTimeText = formatTime(timing.totalStreamTime);
  if (!totalTimeText) return null;

  return (
    <div className="group/timing relative">
      <button
        type="button"
        className="ml-1 flex h-auto items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[#6b6b6b] text-xs tabular-nums transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white"
      >
        {totalTimeText}
      </button>
      <div className="pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 scale-95 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 opacity-0 shadow-lg transition-all before:absolute before:top-0 before:-left-2 before:h-full before:w-2 before:content-[''] group-hover/timing:pointer-events-auto group-hover/timing:scale-100 group-hover/timing:opacity-100 dark:border-[#2a2a2a] dark:bg-[#1a1a1a]">
        <div className="grid min-w-[140px] gap-1.5 text-xs">
          {timing.firstTokenTime !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#6b6b6b] dark:text-[#9a9a9a]">
                First token
              </span>
              <span className="font-mono text-[#0d0d0d] tabular-nums dark:text-white">
                {formatMs(timing.firstTokenTime)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#6b6b6b] dark:text-[#9a9a9a]">Total</span>
            <span className="font-mono text-[#0d0d0d] tabular-nums dark:text-white">
              {formatMs(timing.totalStreamTime)}
            </span>
          </div>
          {timing.tokensPerSecond !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#6b6b6b] dark:text-[#9a9a9a]">Speed</span>
              <span className="font-mono text-[#0d0d0d] tabular-nums dark:text-white">
                {timing.tokensPerSecond.toFixed(1)} tok/s
              </span>
            </div>
          )}
          {timing.totalChunks > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#6b6b6b] dark:text-[#9a9a9a]">Chunks</span>
              <span className="font-mono text-[#0d0d0d] tabular-nums dark:text-white">
                {timing.totalChunks}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

  const [fileSrc, setFileSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setFileSrc(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFileSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return fileSrc ?? src;
};

const GrokAttachment: FC = () => {
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/attachment relative">
      <div className="flex h-12 items-center gap-2 overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#f0f0f0] p-0.5 transition-colors hover:border-[#d0d0d0] dark:border-[#2a2a2a] dark:bg-[#252525] dark:hover:border-[#3a3a3a]">
        <AuiIf condition={(s) => s.attachment.type === "image"}>
          {src ? (
            <img
              className="h-full w-12 rounded-[9px] object-cover"
              alt="Attachment"
              src={src}
            />
          ) : (
            <div className="flex h-full w-12 items-center justify-center rounded-[9px] bg-[#e5e5e5] text-[#6b6b6b] dark:bg-[#3a3a3a] dark:text-[#9a9a9a]">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </AuiIf>
        <AuiIf condition={(s) => s.attachment.type !== "image"}>
          <div className="flex h-full w-12 items-center justify-center rounded-[9px] bg-[#e5e5e5] text-[#6b6b6b] dark:bg-[#3a3a3a] dark:text-[#9a9a9a]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        </AuiIf>
      </div>
      <AttachmentPrimitive.Remove className="absolute -top-1.5 -right-1.5 flex h-6 w-6 scale-50 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#6b6b6b] opacity-0 transition-all hover:bg-[#f5f5f5] hover:text-[#0d0d0d] group-hover/attachment:scale-100 group-hover/attachment:opacity-100 dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#9a9a9a] dark:hover:bg-[#252525] dark:hover:text-white">
        <Cross2Icon width={14} height={14} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};
