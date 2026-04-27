"use client";

import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  ActionBarPrimitive,
  AuiIf,
  AttachmentPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Cross2Icon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { ArrowRight, AudioLines, Plus, Search, Square } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";

const composerPrimaryActionClassName =
  "absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200 ease-out";

const messageActionClassName =
  "flex size-8 items-center justify-center rounded-full text-[#7a7268] transition-colors hover:bg-[#f1ece5] hover:text-[#1f1b17] dark:text-[#9d968d] dark:hover:bg-[#2a2724] dark:hover:text-[#f5f2ed]";

export const Perplexity: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-[#f6f2ec] text-[#1f1b17] dark:bg-[#171615] dark:text-[#f5f2ed]"
      style={{
        ["--thread-max-width" as string]: "40rem",
      }}
    >
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <EmptyState />
      </AuiIf>

      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-auto px-4 pt-12">
          <ThreadPrimitive.Messages>
            {() => <ChatMessage />}
          </ThreadPrimitive.Messages>

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto w-full max-w-(--thread-max-width) bg-linear-to-b from-transparent via-[#f6f2ec]/85 to-[#f6f2ec] pt-6 pb-4 dark:via-[#171615]/85 dark:to-[#171615]">
            <Composer placeholder="Ask a follow-up..." />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

const EmptyState: FC = () => {
  return (
    <div className="flex h-full flex-col justify-center px-4">
      <div className="mx-auto w-full max-w-(--thread-max-width)">
        <p className="mb-8 text-center font-display text-[#25211c] text-[3.1rem] leading-none tracking-[-0.06em] dark:text-[#f5f2ed]">
          perplexity
        </p>
        <Composer placeholder="Ask anything..." />
      </div>
    </div>
  );
};

const Composer: FC<{ placeholder: string }> = ({ placeholder }) => {
  return (
    <ComposerPrimitive.Root className="group/composer mx-auto flex w-full max-w-(--thread-max-width) flex-col rounded-[28px] border border-[#d7d0c5] bg-[#fcfbf8] shadow-[0_10px_30px_-18px_rgba(32,24,18,0.28)] transition-colors focus-within:border-[#b8b0a5] dark:border-[#4a433b] dark:bg-[#23211f] dark:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] dark:focus-within:border-[#6a6258]">
      <AuiIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          <ComposerPrimitive.Attachments>
            {() => <ComposerAttachmentChip />}
          </ComposerPrimitive.Attachments>
        </div>
      </AuiIf>

      <ComposerPrimitive.Input
        rows={1}
        placeholder={placeholder}
        className="min-h-14 w-full resize-none bg-transparent px-5 pt-4 pb-0 text-[1.05rem] leading-7 outline-none placeholder:text-[#8a8176] dark:placeholder:text-[#918a82]"
      />

      <div className="flex items-center justify-between gap-3 px-4 pt-0.5 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <ComposerPrimitive.AddAttachment asChild>
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#6f675d] transition-colors hover:bg-[#f2ede6] hover:text-[#1f1b17] dark:text-[#a39c93] dark:hover:bg-[#2b2825] dark:hover:text-[#f5f2ed]"
              aria-label="Add attachment"
            >
              <Plus className="size-4.5" />
            </button>
          </ComposerPrimitive.AddAttachment>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[#746c62] text-sm transition-colors hover:bg-[#f2ede6] hover:text-[#1f1b17] dark:text-[#a19a91] dark:hover:bg-[#2b2825] dark:hover:text-[#f5f2ed]"
          >
            <span>Model</span>
            <ChevronDownIcon className="size-4 opacity-70" />
          </button>
          <ComposerPrimaryAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ComposerPrimaryAction: FC = () => {
  return (
    <div className="relative size-10 shrink-0">
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel
          className={cn(
            composerPrimaryActionClassName,
            "bg-[#25211c] text-[#f8f5f0] hover:bg-[#171411] dark:bg-[#f5f2ed] dark:text-[#1b1713] dark:hover:bg-white",
          )}
        >
          <Square className="size-3.5 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>

      <AuiIf condition={(s) => !s.thread.isRunning && !s.composer.isEmpty}>
        <ComposerPrimitive.Send
          className={cn(
            composerPrimaryActionClassName,
            "bg-[#25211c] text-[#f8f5f0] hover:bg-[#171411] dark:bg-[#f5f2ed] dark:text-[#1b1713] dark:hover:bg-white",
          )}
        >
          <ArrowRight className="size-5" />
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => !s.thread.isRunning && s.composer.isEmpty}>
        <ComposerPrimitive.If dictation={false}>
          <ComposerPrimitive.Dictate
            className={cn(
              composerPrimaryActionClassName,
              "bg-[#25211c] text-[#f8f5f0] hover:bg-[#171411] dark:bg-[#f5f2ed] dark:text-[#1b1713] dark:hover:bg-white",
            )}
          >
            <AudioLines className="size-5" />
          </ComposerPrimitive.Dictate>
        </ComposerPrimitive.If>

        <ComposerPrimitive.If dictation>
          <ComposerPrimitive.StopDictation
            className={cn(
              composerPrimaryActionClassName,
              "bg-[#25211c] text-[#f8f5f0] hover:bg-[#171411] dark:bg-[#f5f2ed] dark:text-[#1b1713] dark:hover:bg-white",
            )}
          >
            <Square className="size-3.5 animate-pulse fill-current" />
          </ComposerPrimitive.StopDictation>
        </ComposerPrimitive.If>
      </AuiIf>
    </div>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-2 py-4">
      <AuiIf condition={(s) => s.message.role === "user"}>
        <div className="flex flex-col items-end gap-2">
          <div className="flex max-w-full flex-wrap justify-end gap-2">
            <MessagePrimitive.Attachments>
              {() => <MessageAttachmentChip />}
            </MessagePrimitive.Attachments>
          </div>

          <div className="flex items-start gap-2">
            <ActionBarPrimitive.Root className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
              <ActionBarPrimitive.Copy className={messageActionClassName}>
                <CopyIcon className="size-4" />
              </ActionBarPrimitive.Copy>
              <ActionBarPrimitive.Edit className={messageActionClassName}>
                <Pencil1Icon className="size-4" />
              </ActionBarPrimitive.Edit>
            </ActionBarPrimitive.Root>

            <div className="max-w-[85%] rounded-3xl rounded-tr-md border border-[#ddd5c9] bg-[#fcfbf8] px-4 py-3 text-[#2c2721] shadow-[0_1px_0_rgba(31,27,23,0.03)] dark:border-[#38332e] dark:bg-[#23211f] dark:text-[#f1ede7]">
              <div className="prose prose-sm wrap-break-word dark:prose-invert prose-p:my-0">
                <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
              </div>
            </div>
          </div>

          <BranchPicker className="mr-3" />
        </div>
      </AuiIf>

      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex items-start gap-3">
          <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#ddd5c9] bg-[#fffdfa] text-[#5b534a] dark:border-[#38332e] dark:bg-[#23211f] dark:text-[#d9d2c8]">
            <Search className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="prose prose-sm wrap-break-word dark:prose-invert prose-li:my-1 prose-p:my-2 prose-ul:my-2 text-[#2c2721] dark:text-[#ece7df]">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <BranchPicker />
              <ActionBarPrimitive.Root className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
                <ActionBarPrimitive.Reload className={messageActionClassName}>
                  <ReloadIcon className="size-4" />
                </ActionBarPrimitive.Reload>
                <ActionBarPrimitive.Copy className={messageActionClassName}>
                  <AuiIf condition={(s) => s.message.isCopied}>
                    <CheckIcon className="size-4" />
                  </AuiIf>
                  <AuiIf condition={(s) => !s.message.isCopied}>
                    <CopyIcon className="size-4" />
                  </AuiIf>
                </ActionBarPrimitive.Copy>
              </ActionBarPrimitive.Root>
            </div>
          </div>
        </div>
      </AuiIf>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...props
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "inline-flex items-center gap-1 text-[#8a8176] text-xs dark:text-[#9f978e]",
        className,
      )}
      {...props}
    >
      <BranchPickerPrimitive.Previous className={messageActionClassName}>
        <ChevronLeftIcon className="size-4" />
      </BranchPickerPrimitive.Previous>
      <span className="min-w-9 text-center">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next className={messageActionClassName}>
        <ChevronRightIcon className="size-4" />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
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

const AttachmentTypeLabel: FC = () => {
  const typeLabel = useAuiState((s) => {
    switch (s.attachment.type) {
      case "image":
        return "Image";
      case "document":
        return "Document";
      case "file":
        return "File";
      default:
        return s.attachment.type;
    }
  });

  return <span>{typeLabel}</span>;
};

const AttachmentPreview: FC<{ removable: boolean }> = ({ removable }) => {
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/attachment relative">
      <div className="flex max-w-65 items-center gap-3 rounded-2xl border border-[#e3dbcf] bg-[#f5f1eb] py-2 pr-3 pl-2 transition-colors hover:bg-[#efe8de] dark:border-[#3a342f] dark:bg-[#2a2724] dark:hover:bg-[#302c29]">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fffdfa] text-[#6f675d] dark:bg-[#201d1b] dark:text-[#a59f96]">
          {src ? (
            // biome-ignore lint/performance/noImgElement: example component
            <img
              src={src}
              alt="Attachment"
              className="size-full object-cover"
            />
          ) : (
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[#2d2822] text-sm leading-5 dark:text-[#f3efe9]">
            <AttachmentPrimitive.Name />
          </p>
          <p className="text-[#7d7469] text-xs dark:text-[#9d968d]">
            <AttachmentTypeLabel />
          </p>
        </div>
      </div>

      {removable ? (
        <AttachmentPrimitive.Remove className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#ede6dd] text-[#5f574d] opacity-0 transition-all hover:bg-[#dfd5c8] group-hover/attachment:opacity-100 dark:bg-[#3a342f] dark:text-[#d4ccc2] dark:hover:bg-[#4a433b]">
          <Cross2Icon className="size-3.5" />
        </AttachmentPrimitive.Remove>
      ) : null}
    </AttachmentPrimitive.Root>
  );
};

const ComposerAttachmentChip: FC = () => {
  return <AttachmentPreview removable />;
};

const MessageAttachmentChip: FC = () => {
  return <AttachmentPreview removable={false} />;
};
