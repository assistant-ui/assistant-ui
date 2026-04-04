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

import {
  ChevronDownIcon,
  Cross2Icon,
  MixerHorizontalIcon,
  Pencil1Icon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  CopyIcon,
  EllipsisVertical,
  ImageIcon,
  Lightbulb,
  Mic,
  PenLine,
  SendHorizonal,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { GeminiIcon } from "@/components/icons/gemini";

export const Gemini: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#f8f9fa] dark:bg-[#131314]">
      <ThreadPrimitive.Empty>
        <div className="flex h-full flex-col justify-center px-4">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-1 flex items-center gap-3">
              <img src="/icons/gemini.svg" alt="" className="size-5" />
              <p className="text-black text-xl dark:text-white">Hello there</p>
            </div>
            <p className="mb-6 bg-clip-text text-4xl text-black dark:text-white">
              Where would you like to start?
            </p>
          </div>
          <Composer />
          <div className="mx-auto mt-4 flex w-full max-w-3xl flex-wrap justify-center gap-2">
            <SuggestionChip icon={<ImageIcon width={16} height={16} />}>
              Create image
            </SuggestionChip>
            <SuggestionChip icon={<Lightbulb width={16} height={16} />}>
              Help me learn
            </SuggestionChip>
            <SuggestionChip icon={<PenLine width={16} height={16} />}>
              Write anything
            </SuggestionChip>
            <SuggestionChip icon={<Sparkles width={16} height={16} />}>
              Boost my day
            </SuggestionChip>
          </div>
        </div>
      </ThreadPrimitive.Empty>

      <AuiIf condition={(s) => s.thread.isEmpty === false}>
        <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-scroll pt-16">
          <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
        </ThreadPrimitive.Viewport>
        <div className="space-y-2">
          <Composer />
          <p className="my-3 text-center text-[#70757a] text-xs dark:text-[#9aa0a6]">
            Gemini may display inaccurate info, including about people, so
            double-check its responses.
          </p>
        </div>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

const SuggestionChip: FC<{
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, children }) => (
  <button
    type="button"
    className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[#444746] text-sm shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#f1f3f4] dark:bg-[#282a2c] dark:text-[#c4c7c5] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)] dark:hover:bg-[#333537]"
  >
    {icon}
    {children}
  </button>
);

const Composer: FC = () => {
  const isEmpty = useAuiState((s) => s.composer.isEmpty);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  return (
    <ComposerPrimitive.Root
      data-empty={isEmpty}
      data-running={isRunning}
      className="group/composer mx-auto flex w-full max-w-3xl flex-col rounded-4xl bg-white p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.16)] dark:bg-[#1e1f20] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]"
    >
      <AuiIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="overflow-hidden rounded-t-3xl">
          <div className="overflow-x-auto p-3.5">
            <div className="flex flex-row gap-3">
              <ComposerPrimitive.Attachments
                components={{ Attachment: GeminiAttachment }}
              />
            </div>
          </div>
        </div>
      </AuiIf>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <div className="wrap-break-word max-h-96 w-full overflow-y-auto">
            <ComposerPrimitive.Input
              placeholder="Ask Gemini"
              className="block min-h-6 w-full resize-none bg-transparent px-3 py-2 text-[#1f1f1f] outline-none placeholder:text-[#70757a] dark:text-[#e3e3e3] dark:placeholder:text-[#9aa0a6]"
            />
          </div>
        </div>

        <div className="flex w-full items-center text-[#444746] dark:text-[#c4c7c5]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ComposerPrimitive.AddAttachment className="flex size-10 items-center justify-center rounded-full transition-all hover:bg-[#444746]/8 active:scale-[0.98] dark:hover:bg-[#c4c7c5]/8">
              <PlusIcon width={20} height={20} />
            </ComposerPrimitive.AddAttachment>
            <button
              type="button"
              className="flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm transition hover:bg-[#444746]/8 dark:hover:bg-[#c4c7c5]/8"
            >
              <MixerHorizontalIcon width={16} height={16} />
              <span>Tools</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-10 items-center justify-center gap-1 whitespace-nowrap rounded-full px-3 text-sm transition hover:bg-[#444746]/8 dark:hover:bg-[#c4c7c5]/8"
            >
              <span>Flash</span>
              <ChevronDownIcon width={20} height={20} className="opacity-60" />
            </button>
            <div className="relative size-10 shrink-0">
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center rounded-full transition-all duration-300 ease-out hover:bg-[#444746]/8 group-data-[empty=false]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=false]/composer:opacity-0 group-data-[running=true]/composer:opacity-0 dark:hover:bg-[#c4c7c5]/8"
                aria-label="Voice mode"
              >
                <Mic width={20} height={20} />
              </button>
              <ComposerPrimitive.Send className="absolute inset-0 flex items-center justify-center rounded-full bg-[#d3e3fd] text-[#1f1f1f] transition-all duration-300 ease-out hover:bg-[#c2d7fb] group-data-[empty=true]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 group-data-[running=true]/composer:opacity-0 dark:bg-[#1f3760] dark:text-[#e3e3e3] dark:hover:bg-[#2a4a7a]">
                <SendHorizonal width={20} height={20} />
              </ComposerPrimitive.Send>
              <ComposerPrimitive.Cancel className="absolute inset-0 flex items-center justify-center rounded-full bg-[#d3e3fd] text-[#1f1f1f] transition-all duration-300 ease-out hover:bg-[#c2d7fb] group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0 dark:bg-[#1f3760] dark:text-[#e3e3e3] dark:hover:bg-[#2a4a7a]">
                <Square width={14} height={14} fill="currentColor" />
              </ComposerPrimitive.Cancel>
            </div>
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const actionBtnClass =
  "flex size-8 items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#444746]/8 dark:text-[#c4c7c5] dark:hover:bg-[#c4c7c5]/8";

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message relative mx-auto mb-4 flex w-full max-w-3xl flex-col pb-0.5">
      <AuiIf condition={(s) => s.message.role === "user"}>
        <div className="flex items-center justify-end gap-1">
          <ActionBarPrimitive.Root className="flex items-center gap-0.5 pt-1 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Copy className={actionBtnClass}>
              <CopyIcon width={16} height={16} />
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.Edit className={actionBtnClass}>
              <Pencil1Icon width={16} height={16} />
            </ActionBarPrimitive.Edit>
          </ActionBarPrimitive.Root>
          <div className="max-w-[85%] rounded-3xl rounded-tr bg-[#e9eef6] px-4 py-3 text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3]">
            <div className="prose prose-sm dark:prose-invert wrap-break-word">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>
          </div>
        </div>
      </AuiIf>

      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex items-start gap-3">
          <GeminiIcon className="mt-1 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="prose prose-sm dark:prose-invert wrap-break-word prose-li:my-1 prose-ol:my-1 prose-p:my-2 prose-ul:my-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>
            <ActionBarPrimitive.Root className="mt-2 -ml-2 flex items-center gap-0.5 opacity-0 transition-opacity duration-300 group-focus-within/message:opacity-100 group-hover/message:opacity-100">
              <ActionBarPrimitive.FeedbackPositive className={actionBtnClass}>
                <ThumbsUp width={14} height={14} />
              </ActionBarPrimitive.FeedbackPositive>
              <ActionBarPrimitive.FeedbackNegative className={actionBtnClass}>
                <ThumbsDown width={14} height={14} />
              </ActionBarPrimitive.FeedbackNegative>
              <ActionBarPrimitive.Reload className={actionBtnClass}>
                <ReloadIcon width={14} height={14} />
              </ActionBarPrimitive.Reload>
              <ActionBarPrimitive.Copy className={actionBtnClass}>
                <CopyIcon width={14} height={14} />
              </ActionBarPrimitive.Copy>
              <button type="button" className={actionBtnClass}>
                <EllipsisVertical width={14} height={14} />
              </button>
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
    useShallow(({ attachment }): { file?: File; src?: string } => {
      if (attachment.type !== "image") return {};
      if (attachment.file) return { file: attachment.file };
      const src = attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

const GeminiAttachment: FC = () => {
  const isImage = useAuiState(({ attachment }) => attachment.type === "image");
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/thumbnail relative">
      <div
        className="overflow-hidden rounded-lg border border-[#dadce0] shadow-sm hover:border-[#c4c7c5] hover:shadow-md dark:border-[#3c4043] dark:hover:border-[#5f6368]"
        style={{
          width: "120px",
          height: "120px",
          minWidth: "120px",
          minHeight: "120px",
        }}
      >
        <button
          type="button"
          className="relative"
          style={{ width: "120px", height: "120px" }}
        >
          {isImage && src ? (
            <img
              className="h-full w-full object-cover transition duration-400"
              alt="Attachment"
              src={src}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#70757a] dark:text-[#9aa0a6]">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </button>
      </div>
      <AttachmentPrimitive.Remove
        className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full border border-[#dadce0] bg-white text-[#70757a] opacity-0 backdrop-blur-sm transition-all hover:bg-[#f1f3f4] hover:text-[#1f1f1f] group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100 dark:border-[#3c4043] dark:bg-[#1e1f20] dark:text-[#9aa0a6] dark:hover:bg-[#2b2c2f] dark:hover:text-[#e3e3e3]"
        aria-label="Remove attachment"
      >
        <Cross2Icon width={16} height={16} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};
