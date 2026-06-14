"use client";

import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  ActionBarMorePrimitive,
  AuiIf,
  AttachmentPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Cross2Icon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useEffect, useState, type FC } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { useShallow } from "zustand/shallow";
import {
  AudioLines,
  Download,
  Globe,
  ImageIcon,
  Lightbulb,
  Mic,
  MoreHorizontal,
  PlusIcon,
  Share,
  SlidersHorizontal,
  Sparkles,
  Telescope,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/dropdown-menu";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";

export const ChatGPT: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-white px-4 text-[#0d0d0d] dark:bg-[#212121] dark:text-[#ececec]">
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <EmptyState />
      </AuiIf>

      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <ThreadPrimitive.Viewport className="flex grow flex-col gap-8 overflow-y-scroll pt-16">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.composer.isEditing) return <EditComposer />;
              if (message.role === "user") return <UserMessage />;
              return <AssistantMessage />;
            }}
          </ThreadPrimitive.Messages>

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col gap-2 overflow-visible rounded-t-3xl bg-white pb-2 dark:bg-[#212121]">
            <ThreadScrollToBottom />
            <Composer placeholder="Ask anything" />
            <p className="text-center text-xs text-[#5d5d5d] dark:text-[#a8a8a8]">
              ChatGPT can make mistakes. Check important info.
            </p>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

const EmptyState: FC = () => {
  return (
    <div className="flex grow flex-col items-center justify-center px-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-6">
        <h1 className="text-center text-2xl font-medium text-[#0d0d0d] sm:text-3xl dark:text-[#ececec]">
          Where should we begin?
        </h1>
        <Composer placeholder="Ask anything" />
      </div>
    </div>
  );
};

const Composer: FC<{ placeholder: string }> = ({ placeholder }) => {
  return (
    <ComposerPrimitive.Root className="group/composer flex w-full flex-col rounded-[28px] border border-[#e5e5e5] bg-white px-2 py-2 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.05)] focus-within:border-[#d0d0d0] dark:border-transparent dark:bg-[#303030] dark:shadow-none dark:focus-within:border-transparent">
      <AuiIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="flex flex-row flex-wrap gap-2 px-1 pt-1 pb-2">
          <ComposerPrimitive.Attachments
            components={{ Attachment: ChatGPTAttachmentUI }}
          />
        </div>
      </AuiIf>

      <ComposerPrimitive.Input
        placeholder={placeholder}
        rows={1}
        className="min-h-9 w-full resize-none bg-transparent px-3 pt-2 text-base text-[#0d0d0d] outline-none placeholder:text-[#8e8e8e] dark:text-[#ececec] dark:placeholder:text-[#8e8e8e]"
      />

      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-1">
          <ComposerPrimitive.AddAttachment asChild>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full text-[#5d5d5d] transition-colors hover:bg-[#0d0d0d]/5 hover:text-[#0d0d0d] dark:text-[#cdcdcd] dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Add attachment"
            >
              <PlusIcon size={18} />
            </button>
          </ComposerPrimitive.AddAttachment>
        </div>

        <div className="flex items-center gap-1">
          <ChatGPTToolsMenu />
          <ComposerPrimaryAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const CHATGPT_TOOLS = [
  { id: "search", label: "Search the web", Icon: Globe },
  { id: "image", label: "Create an image", Icon: ImageIcon },
  { id: "research", label: "Run deep research", Icon: Telescope },
  { id: "think", label: "Think longer", Icon: Lightbulb },
  { id: "study", label: "Study and learn", Icon: Sparkles },
];

const ChatGPTToolsMenu: FC = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm text-[#5d5d5d] transition-colors hover:bg-[#0d0d0d]/5 hover:text-[#0d0d0d] sm:flex dark:text-[#cdcdcd] dark:hover:bg-white/10 dark:hover:text-white">
        <SlidersHorizontal className="size-4" />
        <span>Tools</span>
        <ChevronDownIcon className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {CHATGPT_TOOLS.map(({ id, label, Icon }) => (
          <DropdownMenuItem
            key={id}
            icon={<Icon className="size-4" />}
            className="text-foreground text-sm"
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ComposerPrimaryAction: FC = () => {
  return (
    <div className="flex items-center gap-1">
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel className="flex size-9 items-center justify-center rounded-full bg-[#0d0d0d] text-white dark:bg-white dark:text-black">
          <div className="size-2.5 rounded-[2px] bg-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>

      <AuiIf
        condition={(s) => !s.thread.isRunning && s.composer.dictation != null}
      >
        <ComposerPrimitive.StopDictation
          className="flex size-9 items-center justify-center rounded-full bg-[#ff5d1f] text-white"
          aria-label="Stop dictation"
        >
          <div className="size-2.5 animate-pulse rounded-[2px] bg-current" />
        </ComposerPrimitive.StopDictation>
      </AuiIf>

      <AuiIf
        condition={(s) =>
          !s.thread.isRunning &&
          s.composer.dictation == null &&
          !s.composer.isEmpty
        }
      >
        <ComposerPrimitive.Send className="flex size-9 items-center justify-center rounded-full bg-[#0d0d0d] text-white transition-opacity disabled:opacity-30 dark:bg-white dark:text-black">
          <ArrowUpIcon className="size-5" />
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf
        condition={(s) =>
          !s.thread.isRunning &&
          s.composer.dictation == null &&
          s.composer.isEmpty
        }
      >
        <ComposerPrimitive.Dictate
          className="flex size-9 items-center justify-center rounded-full text-[#5d5d5d] transition-colors hover:bg-[#0d0d0d]/5 hover:text-[#0d0d0d] dark:text-[#cdcdcd] dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Dictate"
        >
          <Mic className="size-4" />
        </ComposerPrimitive.Dictate>

        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="flex size-9 items-center justify-center rounded-full bg-[#ff5d1f] text-white"
        >
          <AudioLines className="size-4" />
        </button>
      </AuiIf>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        className="bg-background absolute -top-10 z-10 self-center rounded-full border p-2 shadow-sm disabled:invisible dark:border-white/15 dark:bg-[#2a2a2a]"
      >
        <ChevronDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl flex-col items-end gap-1">
      <div className="flex flex-row flex-wrap justify-end gap-2">
        <MessagePrimitive.Attachments
          components={{ Attachment: ChatGPTAttachmentUI }}
        />
      </div>

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

        <div className="bg-secondary text-foreground rounded-3xl px-5 py-2 dark:bg-white/5 dark:text-[#eee]">
          <MessagePrimitive.Parts />
        </div>
      </div>

      <BranchPicker className="mt-2 mr-3" />
    </MessagePrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-secondary mx-auto flex w-full max-w-3xl flex-col justify-end gap-1 rounded-3xl dark:bg-white/15">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent p-5 pb-0 outline-none dark:text-white" />

      <div className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel className="bg-background text-foreground hover:bg-muted rounded-full px-3 py-2 text-sm font-semibold dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800">
          Cancel
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3 py-2 text-sm font-semibold dark:bg-white dark:text-black dark:hover:bg-white/90">
          Send
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const assistantActionClassName =
  "flex size-8 items-center justify-center rounded-md text-[#5d5d5d] transition-colors hover:bg-[#0d0d0d]/5 hover:text-[#0d0d0d] dark:text-[#afafaf] dark:hover:bg-white/10 dark:hover:text-white";

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl flex-col">
      <div className="text-[#0d0d0d] dark:text-[#ececec]">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MarkdownText />;
            if (part.type === "tool-call")
              return part.toolUI ?? <ToolFallback {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>
      </div>

      <div className="-ml-2 flex items-center pt-1">
        <ActionBarPrimitive.Root
          hideWhenRunning
          className="flex items-center gap-0.5"
        >
          <ActionBarPrimitive.Copy className={assistantActionClassName}>
            <AuiIf condition={(s) => s.message.isCopied}>
              <CheckIcon />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <CopyIcon />
            </AuiIf>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.FeedbackPositive
            className={assistantActionClassName}
          >
            <ThumbsUp className="size-4" />
          </ActionBarPrimitive.FeedbackPositive>
          <ActionBarPrimitive.FeedbackNegative
            className={assistantActionClassName}
          >
            <ThumbsDown className="size-4" />
          </ActionBarPrimitive.FeedbackNegative>
          <ActionBarPrimitive.Speak className={assistantActionClassName}>
            <Volume2 className="size-4" />
          </ActionBarPrimitive.Speak>
          <button type="button" className={assistantActionClassName}>
            <Share className="size-4" />
          </button>
          <ActionBarPrimitive.Reload className={assistantActionClassName}>
            <ReloadIcon />
          </ActionBarPrimitive.Reload>
          <ActionBarMorePrimitive.Root>
            <ActionBarMorePrimitive.Trigger asChild>
              <button
                type="button"
                aria-label="More"
                className={cn(
                  assistantActionClassName,
                  "data-[state=open]:bg-[#0d0d0d]/5 dark:data-[state=open]:bg-white/10",
                )}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </ActionBarMorePrimitive.Trigger>
            <ActionBarMorePrimitive.Content
              side="bottom"
              align="end"
              sideOffset={6}
              className="bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 z-50 min-w-40 overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
            >
              <ActionBarPrimitive.ExportMarkdown asChild>
                <ActionBarMorePrimitive.Item className="text-muted-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none">
                  <Download className="size-4" />
                  Export as Markdown
                </ActionBarMorePrimitive.Item>
              </ActionBarPrimitive.ExportMarkdown>
            </ActionBarMorePrimitive.Content>
          </ActionBarMorePrimitive.Root>
        </ActionBarPrimitive.Root>
        <BranchPicker className="ml-1" />
      </div>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "text-muted-foreground inline-flex items-center text-sm font-semibold dark:text-[#b4b4b4]",
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

const ChatGPTAttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/attachment relative">
      <div className="bg-secondary flex items-center gap-2 overflow-hidden rounded-2xl border dark:bg-white/5">
        <AuiIf condition={(s) => s.attachment.type === "image"}>
          {src ? (
            <img
              className="size-32 rounded-md object-cover"
              alt="Attachment"
              src={src}
            />
          ) : (
            <div className="flex h-full w-12 items-center justify-center rounded-md">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </AuiIf>
        <AuiIf condition={(s) => s.attachment.type !== "image"}>
          <div className="bg-background flex h-full w-12 items-center justify-center rounded-[9px] text-[#6b6b6b] dark:bg-[#3a3a3a] dark:text-[#9a9a9a]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        </AuiIf>
      </div>
      {isComposer && (
        <AttachmentPrimitive.Remove className="absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#6b6b6b] transition-all hover:bg-[#f5f5f5] hover:text-[#0d0d0d] dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#9a9a9a] dark:hover:bg-[#252525] dark:hover:text-white">
          <Cross2Icon fontSize={8} />
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
};
