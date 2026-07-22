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
  ArrowUpIcon,
  AudioLines,
  Calendar as CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  Code as CodeIcon,
  FolderOpen,
  GraduationCap,
  PencilIcon,
  PenLine,
  PlusIcon,
  RefreshCwIcon,
  Sparkle,
  ThumbsDown,
  ThumbsUp,
  XIcon,
} from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useShallow } from "zustand/shallow";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { CloneThreadShell } from "./clone-thread-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const messageActionButtonClassName =
  "flex size-8 items-center justify-center rounded-md text-[#5b5950] transition-colors hover:bg-[#1a1a18]/5 hover:text-[#1a1a18] dark:text-[#a3a098] dark:hover:bg-white/5 dark:hover:text-[#eee]";

export const Claude: FC = () => {
  return (
    <CloneThreadShell>
      <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#F0ECE0] font-serif text-[#1a1a18] dark:bg-[#2b2a27] dark:text-[#eee]">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <EmptyState />
        </AuiIf>

        <AuiIf condition={(s) => !s.thread.isEmpty}>
          <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-auto px-4 pt-12">
            <ThreadPrimitive.Messages>
              {() => <ChatMessage />}
            </ThreadPrimitive.Messages>

            <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto w-full max-w-3xl bg-linear-to-b from-transparent via-[#F0ECE0]/85 to-[#F0ECE0] pt-4 pb-2 dark:via-[#2b2a27]/85 dark:to-[#2b2a27]">
              <Composer />
              <p className="pt-2 text-center text-xs text-[#8a8780] dark:text-[#a3a098]">
                Claude can make mistakes. Please double-check responses.
              </p>
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </AuiIf>
      </ThreadPrimitive.Root>
    </CloneThreadShell>
  );
};

const EmptyState: FC = () => {
  return (
    <div className="flex grow flex-col items-center justify-center px-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch gap-5">
        <h1 className="flex items-center justify-center gap-3 font-serif text-3xl text-[#1a1a18] sm:text-4xl dark:text-[#eee]">
          <Sparkle className="size-7 fill-[#c96442] text-[#c96442]" />
          <span>How can I help you today?</span>
        </h1>
        <Composer />
        <ModeTabs />
      </div>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex w-full flex-col gap-2 rounded-2xl border border-[#E5E0D6] bg-white px-3.5 pt-3 pb-2.5 dark:border-[#3d3a35] dark:bg-[#1f1e1b]">
      <ComposerPrimitive.Input
        placeholder="How can I help you today?"
        rows={1}
        className="block max-h-72 min-h-6 w-full resize-none bg-transparent text-[#1a1a18] outline-none placeholder:text-[#9a9893] dark:text-[#eee] dark:placeholder:text-[#9a9893]"
      />

      <div className="flex w-full items-center gap-2">
        <ComposerPrimitive.AddAttachment
          aria-label="Add attachment"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#5b5950] transition-colors hover:bg-[#1a1a18]/5 hover:text-[#1a1a18] dark:text-[#a3a098] dark:hover:bg-white/5 dark:hover:text-[#eee]"
        >
          <PlusIcon width={16} height={16} />
        </ComposerPrimitive.AddAttachment>

        <div className="ml-auto flex items-center gap-1">
          <ClaudeModelPicker />
          <ComposerPrimaryAction />
        </div>
      </div>

      <AuiIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="-mx-1 -mb-1 flex flex-row gap-2 overflow-x-auto pt-1">
          <ComposerPrimitive.Attachments>
            {() => <ClaudeAttachment />}
          </ComposerPrimitive.Attachments>
        </div>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
};

const ComposerPrimaryAction: FC = () => {
  return (
    <>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel className="flex size-8 items-center justify-center rounded-md bg-[#c96442] text-white transition-colors hover:bg-[#b1573a]">
          <div className="size-2.5 rounded-[2px] bg-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>

      <AuiIf
        condition={(s) => !s.thread.isRunning && s.composer.dictation != null}
      >
        <ComposerPrimitive.StopDictation
          className="flex size-8 items-center justify-center rounded-md bg-[#c96442] text-white transition-colors hover:bg-[#b1573a]"
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
        <ComposerPrimitive.Send className="flex size-8 items-center justify-center rounded-md bg-[#c96442] text-white transition-colors hover:bg-[#b1573a] disabled:pointer-events-none disabled:opacity-50">
          <ArrowUpIcon width={16} height={16} />
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
          className="flex size-8 items-center justify-center rounded-md text-[#5b5950] transition-colors hover:bg-[#1a1a18]/5 hover:text-[#1a1a18] dark:text-[#a3a098] dark:hover:bg-white/5 dark:hover:text-[#eee]"
          aria-label="Use voice mode"
        >
          <AudioLines className="size-4" />
        </ComposerPrimitive.Dictate>
      </AuiIf>
    </>
  );
};

const CLAUDE_MODELS = [
  {
    id: "sonnet-4.5",
    name: "Sonnet 4.5",
    description: "Smart, fast, everyday tasks",
  },
  {
    id: "opus-4.7",
    name: "Opus 4.7",
    description: "Anthropic's most capable model",
  },
  {
    id: "haiku-4.5",
    name: "Haiku 4.5",
    description: "Fastest, most affordable",
  },
];

const ClaudeModelPicker: FC = () => {
  const [model, setModel] = useState(CLAUDE_MODELS[0]!.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm whitespace-nowrap text-[#1a1a18] transition hover:bg-[#1a1a18]/5 dark:text-[#eee] dark:hover:bg-white/5">
        <span className="font-serif">
          {CLAUDE_MODELS.find((m) => m.id === model)?.name}
        </span>
        <ChevronDownIcon width={16} height={16} className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        {CLAUDE_MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => setModel(m.id)}
            className="flex items-start gap-3"
          >
            <span className="mt-0.5 flex size-4 items-center justify-center text-[#c96442]">
              {m.id === model ? <CheckIcon /> : null}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-foreground font-serif text-sm">
                {m.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {m.description}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-muted-foreground text-sm">
          More options
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ModeTabs: FC = () => {
  const tabs = [
    { label: "Write", Icon: PenLine },
    { label: "Learn", Icon: GraduationCap },
    { label: "Code", Icon: CodeIcon },
    { label: "From Drive", Icon: FolderOpen },
    { label: "From Calendar", Icon: CalendarIcon },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {tabs.map(({ label, Icon }) => (
        <button
          key={label}
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E5E0D6] bg-transparent px-3 text-sm whitespace-nowrap text-[#3d3a35] transition-colors hover:bg-white/60 dark:border-[#3d3a35] dark:text-[#cdc9be] dark:hover:bg-[#1f1e1b]/60"
        >
          <Icon className="size-3.5 text-[#8a8780] dark:text-[#a3a098]" />
          <span className="font-serif">{label}</span>
        </button>
      ))}
    </div>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message relative mx-auto flex w-full max-w-3xl flex-col py-2">
      <AuiIf condition={(s) => s.message.role === "user"}>
        <div className="flex flex-col items-end gap-1">
          <div className="max-w-[80%] rounded-2xl bg-[#E5E0D6] px-4 py-2.5 wrap-break-word whitespace-pre-wrap text-[#1a1a18] dark:bg-[#393937] dark:text-[#eee]">
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === "text") return <MarkdownText />;
                return null;
              }}
            </MessagePrimitive.Parts>
          </div>
          <ActionBarPrimitive.Root className="-mt-px flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Edit className={messageActionButtonClassName}>
              <PencilIcon width={16} height={16} />
            </ActionBarPrimitive.Edit>
            <ActionBarPrimitive.Copy className={messageActionButtonClassName}>
              <AuiIf condition={(s) => s.message.isCopied}>
                <CheckIcon />
              </AuiIf>
              <AuiIf condition={(s) => !s.message.isCopied}>
                <ClipboardIcon width={16} height={16} />
              </AuiIf>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>
      </AuiIf>

      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex flex-col">
          <div className="prose prose-claude font-serif leading-[1.65rem] wrap-break-word text-[#1a1a18] dark:text-[#eee]">
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === "text") return <MarkdownText />;
                return null;
              }}
            </MessagePrimitive.Parts>
          </div>
          <ActionBarPrimitive.Root className="mt-2 flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Copy className={messageActionButtonClassName}>
              <AuiIf condition={(s) => s.message.isCopied}>
                <CheckIcon />
              </AuiIf>
              <AuiIf condition={(s) => !s.message.isCopied}>
                <ClipboardIcon width={16} height={16} />
              </AuiIf>
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.FeedbackPositive
              className={messageActionButtonClassName}
            >
              <ThumbsUp className="size-4" />
            </ActionBarPrimitive.FeedbackPositive>
            <ActionBarPrimitive.FeedbackNegative
              className={messageActionButtonClassName}
            >
              <ThumbsDown className="size-4" />
            </ActionBarPrimitive.FeedbackNegative>
            <ActionBarPrimitive.Reload className={messageActionButtonClassName}>
              <RefreshCwIcon width={16} height={16} />
            </ActionBarPrimitive.Reload>
          </ActionBarPrimitive.Root>
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
        className="overflow-hidden rounded-lg border border-[#E5E0D6] dark:border-[#3d3a35]"
        style={{ width: "80px", height: "80px" }}
      >
        {isImage && src ? (
          <img
            className="h-full w-full object-cover"
            alt="Attachment"
            src={src}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white text-[#5b5950] dark:bg-[#2b2a27] dark:text-[#a3a098]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        )}
      </div>
      <AttachmentPrimitive.Remove
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-[#1a1a18] text-white opacity-0 transition-opacity group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100 hover:bg-[#3d3a35] dark:bg-white dark:text-[#1a1a18] dark:hover:bg-[#cdc9be]"
        aria-label="Remove attachment"
      >
        <XIcon width={12} height={12} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};
