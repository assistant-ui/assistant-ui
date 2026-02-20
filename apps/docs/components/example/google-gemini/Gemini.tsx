"use client";

import {
  ActionBarPrimitive,
  AssistantIf,
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantState,
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
  Mic,
  SendHorizonal,
  Square,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useShallow } from "zustand/shallow";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { HTMLAttributes } from "react";

export const Gemini: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#F5F5F0] dark:bg-black">
      <ThreadPrimitive.Empty>
        <div className="flex h-full flex-col justify-center">
          <div className="flex gap-4 pl-10">
            <GeminiLogo className="mb-6 h-10 text-[#0d0d0d] dark:text-white" />
            <p className="text-4xl">How can I help you today?</p>
          </div>
          <Composer />
        </div>
      </ThreadPrimitive.Empty>

      <AssistantIf condition={(s) => s.thread.isEmpty === false}>
        <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-scroll pt-16">
          <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
          <p className="mx-auto w-full max-w-3xl p-2 text-center text-[#9a9a9a] text-xs">
            Gemini can make mistakes. Verify important information.
          </p>
        </ThreadPrimitive.Viewport>
        <Composer />
      </AssistantIf>
    </ThreadPrimitive.Root>
  );
};

const Composer: FC = () => {
  const isEmpty = useAssistantState((s) => s.composer.isEmpty);
  const isRunning = useAssistantState((s) => s.thread.isRunning);
  return (
    <ComposerPrimitive.Root
      data-empty={isEmpty}
      data-running={isRunning}
      className="group/composer mx-auto my-2 flex w-full max-w-3xl flex-col rounded-4xl border border-transparent bg-white p-0.5 shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(0,0,0,0.08)] transition-shadow duration-200 focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075),0_0_0_0.5px_rgba(0,0,0,0.15)] hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05),0_0_0_0.5px_rgba(0,0,0,0.12)] dark:bg-[#1f1e1b] dark:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.15)] dark:hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.3)] dark:focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(108,106,96,0.3)]"
    >
      <AssistantIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="overflow-hidden rounded-b-2xl">
          <div className="overflow-x-auto rounded-b-2xl border-[#00000015] p-3.5 dark:border-[#6c6a6040]">
            <div className="flex flex-row gap-3">
              <ComposerPrimitive.Attachments
                components={{ Attachment: GeminiAttachment }}
              />
            </div>
          </div>
        </div>
      </AssistantIf>

      <div className="m-3.5 flex flex-col gap-3.5">
        <div className="relative">
          <div className="wrap-break-word max-h-96 w-full overflow-y-auto">
            <ComposerPrimitive.Input
              placeholder="Ask Gemini"
              className="block min-h-6 w-full resize-none bg-transparent text-[#1a1a18] outline-none placeholder:text-[#9a9893] dark:text-[#eee] dark:placeholder:text-[#9a9893]"
            />
          </div>
        </div>

        <div className="flex w-full items-center gap-2 text-gray-800 dark:text-white">
          <div className="relative flex min-w-0 flex-1 shrink items-center gap-2">
            <ComposerPrimitive.AddAttachment className="flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-full bg-transparent px-1.5 transition-all hover:bg-[#f5f5f0] active:scale-[0.98] dark:hover:bg-[#393937]">
              <PlusIcon width={16} height={16} />
            </ComposerPrimitive.AddAttachment>
            <button
              type="button"
              className="flex h-8 min-w-8 items-center justify-center gap-1 overflow-hidden rounded-4xl bg-transparent px-1.5 transition-all hover:bg-[#f5f5f0] active:scale-[0.98] dark:hover:bg-[#393937]"
              aria-label="Open tools menu"
            >
              <MixerHorizontalIcon width={16} height={16} />
              <p>Tools</p>
            </button>
          </div>

          <button
            type="button"
            className="flex h-8 min-w-16 items-center justify-center gap-1 whitespace-nowrap rounded-4xl px-2 pr-2 pl-2.5 text-[#1a1a18] text-xs transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-[#f5f5f0] active:scale-[0.985] dark:text-[#eee] dark:hover:bg-[#393937]"
          >
            <span className="text-[14px]">Fast</span>
            <ChevronDownIcon width={20} height={20} className="opacity-75" />
          </button>
          <div className="relative mb-0.5 h-9 w-9 shrink-0 rounded-full">
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center rounded-full transition-all duration-300 ease-out hover:bg-[#f5f5f0] group-data-[empty=false]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=false]/composer:opacity-0 group-data-[running=true]/composer:opacity-0 dark:hover:bg-[#393937]"
              aria-label="Voice mode"
            >
              <Mic width={18} height={18} />
            </button>

            <ComposerPrimitive.Send className="absolute inset-0 flex items-center justify-center rounded-full transition-all duration-300 ease-out hover:bg-[#f5f5f0] group-data-[empty=true]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 group-data-[running=true]/composer:opacity-0 dark:hover:bg-[#393937]">
              <SendHorizonal width={18} height={18} />
            </ComposerPrimitive.Send>

            <ComposerPrimitive.Cancel className="absolute inset-0 flex items-center justify-center rounded-full transition-all duration-300 ease-out hover:bg-[#f5f5f0] group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0 dark:hover:bg-[#393937]">
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
      <AssistantIf condition={(s) => s.message.role === "user"}>
        <div className="flex flex-col items-end">
          <div className="relative max-w-[90%] rounded-3xl rounded-br-lg border border-[#e5e5e5] bg-[#f0f0f0] px-4 py-3 text-[#0d0d0d] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-white">
            <div className="prose prose-sm dark:prose-invert wrap-break-word">
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
      </AssistantIf>

      <AssistantIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex flex-col items-start">
          <div className="w-full max-w-none">
            <div className="prose prose-sm wrap-break-word dark:prose-invert prose-li:my-1 prose-ol:my-1 prose-p:my-2 prose-ul:my-1 text-[#0d0d0d] dark:text-[#e5e5e5]">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>
          </div>
          <div className="mt-1 flex h-8 w-full items-center justify-start gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Root className="-ml-2 flex items-center gap-0.5">
              <ActionBarPrimitive.FeedbackPositive className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ThumbsUp width={16} height={16} />
              </ActionBarPrimitive.FeedbackPositive>
              <ActionBarPrimitive.FeedbackNegative className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ThumbsDown width={16} height={16} />
              </ActionBarPrimitive.FeedbackNegative>
              <ActionBarPrimitive.Reload className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ReloadIcon width={16} height={16} />
              </ActionBarPrimitive.Reload>
              <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <CopyIcon width={16} height={16} />
              </ActionBarPrimitive.Copy>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AssistantIf>
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
  const { file, src } = useAssistantState(
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
  const isImage = useAssistantState(
    ({ attachment }) => attachment.type === "image",
  );
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
          className="relative"
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
        className="-right-2 -top-2 absolute flex size-10 items-center justify-center rounded-full border border-[#00000020] bg-white text-[#6b6a68] opacity-0 backdrop-blur-sm transition-all hover:bg-white hover:text-[#1a1a18] group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100 dark:border-[#6c6a6040] dark:bg-black dark:text-[#9a9893] dark:hover:bg-[#1f1e1b] dark:hover:text-[#eee]"
        aria-label="Remove attachment"
      >
        <Cross2Icon width={24} height={24} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};

const GeminiLogo = ({
  className,
  ...props
}: HTMLAttributes<HTMLImageElement>) => (
  <img
    className={className}
    src="/logos/google-gemini.svg"
    alt="Gemini "
    {...props}
  />
);
