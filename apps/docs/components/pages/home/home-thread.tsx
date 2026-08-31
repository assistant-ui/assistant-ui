"use client";

import {
  ActionBarPrimitive,
  type AssistantState,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  type ToolCallMessagePartProps,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  Maximize2Icon,
  Minimize2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SquareIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { Reasoning } from "@/components/assistant-ui/elements/reasoning.aui";
import {
  TraceLine,
  formatDuration,
  useToolDuration,
} from "@/components/shared/trace-line";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  (!s.thread.isLoading || s.threads.isLoading);

const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

export function HomeThread({
  expanded = false,
  onToggleExpanded,
}: {
  expanded?: boolean;
  onToggleExpanded?: (() => void) | undefined;
} = {}): ReactNode {
  return (
    <div className="bg-background grid h-full grid-rows-[3rem_minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] hidden h-12 items-center gap-2 border-r border-b px-4 md:flex">
        <span
          aria-hidden
          className="bg-foreground/80 block size-4 [mask-image:url(/favicon/icon.svg)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]"
        />
        <span className="text-[13px] font-medium">assistant-ui</span>
      </div>
      <div className="border-foreground/10 flex h-12 min-w-0 items-center gap-2 border-b px-4 md:px-5">
        <ThreadTitle />
        {onToggleExpanded ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={expanded ? "Exit full screen" : "Full screen"}
            className="text-muted-foreground hover:text-foreground rounded-control ml-auto grid size-7 shrink-0 place-items-center transition-colors"
          >
            {expanded ? (
              <Minimize2Icon className="size-3.5" />
            ) : (
              <Maximize2Icon className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>
      <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] hidden min-h-0 flex-col overflow-y-auto border-r p-3 md:flex">
        <ThreadListPrimitive.Root className="flex flex-col">
          <ThreadListPrimitive.New asChild>
            <button
              type="button"
              className="border-foreground/10 bg-background hover:border-foreground/25 rounded-control flex h-8 w-full shrink-0 items-center gap-2 border px-2.5 text-[13px] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              New thread
            </button>
          </ThreadListPrimitive.New>
          <SidebarThreads />
        </ThreadListPrimitive.Root>
      </div>
      <main className="min-h-0 min-w-0">
        <SpecimenThread />
      </main>
    </div>
  );
}

function ThreadTitle(): ReactNode {
  const title = useAuiState(
    (s) =>
      s.threads.threadItems.find((t) => t.id === s.threads.mainThreadId)?.title,
  );

  return (
    <span className="min-w-0 truncate text-[13px] font-medium">
      {title ?? "New chat"}
    </span>
  );
}

const SIDEBAR_SKELETON_WIDTHS = [
  "w-full",
  "w-4/5",
  "w-11/12",
  "w-3/5",
  "w-4/5",
];

function SidebarThreads(): ReactNode {
  const isLoading = useAuiState((s) => s.threads.isLoading);
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  if (!isLoading && !hasThreads) return null;

  return (
    <>
      <p className={cn(typeEyebrow, "mt-5 mb-1 px-2")}>Threads</p>
      {isLoading && !hasThreads ? (
        <div
          role="status"
          aria-label="Loading threads"
          className="flex flex-col gap-0.5"
        >
          {SIDEBAR_SKELETON_WIDTHS.map((width, index) => (
            <div key={index} className="flex h-8 items-center px-2">
              <Skeleton className={cn("h-3.5", width)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <ThreadListPrimitive.Items>
            {() => <SidebarThreadRow />}
          </ThreadListPrimitive.Items>
        </div>
      )}
    </>
  );
}

function SidebarThreadRow(): ReactNode {
  const [isRenaming, setIsRenaming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (isRenaming || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [isRenaming]);

  return (
    <ThreadListItemPrimitive.Root className="group data-active:bg-foreground/[0.06] hover:bg-foreground/[0.04] has-data-[state=open]:bg-foreground/[0.04] rounded-control relative flex h-8 shrink-0 items-center transition-colors">
      {isRenaming ? (
        <SidebarThreadRename
          onDone={(restoreFocus) => {
            restoreFocusRef.current = restoreFocus;
            setIsRenaming(false);
          }}
        />
      ) : (
        <ThreadListItemPrimitive.Trigger
          ref={triggerRef}
          className="text-muted-foreground group-data-active:text-foreground hover:text-foreground flex h-full min-w-0 flex-1 items-center px-2 text-left text-[13px] transition-colors outline-none group-hover:pe-8 group-has-focus-visible:pe-8 group-has-data-[state=open]:pe-8 group-data-active:pe-8"
        >
          <span className="min-w-0 truncate">
            <ThreadListItemPrimitive.Title fallback="New chat" />
          </span>
        </ThreadListItemPrimitive.Trigger>
      )}
      <SidebarThreadMore onRename={() => setIsRenaming(true)} />
    </ThreadListItemPrimitive.Root>
  );
}

function SidebarThreadRename({
  onDone,
}: {
  onDone: (restoreFocus: boolean) => void;
}): ReactNode {
  const aui = useAui();
  const title = useAuiState((s) => s.threadListItem.title) ?? "";
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = (restoreFocus: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;

    const next = value.trim();
    if (!next || next === title) {
      onDone(restoreFocus);
      return;
    }

    Promise.resolve()
      .then(() => aui.threadListItem.rename(next))
      .then(
        () => onDone(restoreFocus),
        () => {
          settledRef.current = false;
          if (restoreFocus) inputRef.current?.focus();
        },
      );
  };

  const cancel = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    onDone(true);
  };

  return (
    <Input
      ref={inputRef}
      autoFocus
      aria-label="Rename thread"
      value={value}
      className="h-7 min-w-0 flex-1 ps-2 pe-8 text-[13px]"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => commit(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
    />
  );
}

const threadMenuItemClass =
  "hover:bg-muted focus:bg-muted flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none select-none";

function SidebarThreadMore({ onRename }: { onRename: () => void }): ReactNode {
  return (
    <ThreadListItemMorePrimitive.Root sharedFocusGroup>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Thread actions"
          className="text-muted-foreground hover:text-foreground absolute end-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-sm opacity-0 transition-colors group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontalIcon className="size-3.5" />
        </button>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="right"
        align="start"
        sideOffset={6}
        className="bg-popover text-popover-foreground border-foreground/10 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out rounded-surface z-[70] min-w-28 overflow-hidden border p-1"
      >
        <ThreadListItemMorePrimitive.Item
          className={threadMenuItemClass}
          onSelect={onRename}
        >
          <PencilIcon className="size-3.5" />
          Rename
        </ThreadListItemMorePrimitive.Item>
        <ThreadListItemPrimitive.Archive asChild>
          <ThreadListItemMorePrimitive.Item className={threadMenuItemClass}>
            <ArchiveIcon className="size-3.5" />
            Archive
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <ThreadListItemMorePrimitive.Item
            className={cn(
              threadMenuItemClass,
              "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive",
            )}
          >
            <TrashIcon className="size-3.5" />
            Delete
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
}

function SpecimenThread(): ReactNode {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col"
      style={{ ["--thread-max-width" as string]: "42rem" }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className={cn(
          "relative flex flex-1 flex-col overflow-y-auto px-4 pt-6 md:px-6",
          isEmpty && "justify-center",
        )}
      >
        <AuiIf condition={isNewChatView}>
          <div className="animate-in fade-in slide-in-from-bottom-1 mx-auto mb-8 flex w-full max-w-(--thread-max-width) flex-col items-center text-center duration-200">
            <p className="font-display text-2xl font-[550] tracking-[-0.01em]">
              How can I help you today?
            </p>
          </div>
        </AuiIf>
        <AuiIf condition={isHistoryLoadingView}>
          <div
            role="status"
            className="animate-in fade-in fill-mode-both mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-y-6 [animation-delay:150ms] [animation-duration:200ms]"
          >
            <span className="sr-only">Loading conversation</span>
            <Skeleton className="rounded-thread ml-auto h-9 w-2/5 motion-reduce:animate-none" />
            <div className="flex flex-col gap-y-2">
              <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-4/5 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-3/5 motion-reduce:animate-none" />
            </div>
            <Skeleton className="rounded-thread ml-auto h-9 w-1/3 motion-reduce:animate-none" />
            <div className="flex flex-col gap-y-2">
              <Skeleton className="h-4 w-10/12 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
            </div>
          </div>
        </AuiIf>

        <div className="mb-12 flex flex-col gap-y-6 empty:hidden">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.role === "user") return <SpecimenUserMessage />;
              if (message.role === "assistant")
                return <SpecimenAssistantMessage />;
              return null;
            }}
          </ThreadPrimitive.Messages>
        </div>

        <ThreadPrimitive.ViewportFooter
          className={cn(
            "bg-background mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-3 overflow-visible pb-5",
            !isEmpty && "sticky bottom-0 mt-auto",
          )}
        >
          <ThreadPrimitive.ScrollToBottom asChild>
            <button
              type="button"
              aria-label="Scroll to bottom"
              className="border-foreground/10 bg-background hover:border-foreground/25 rounded-capsule absolute -top-11 z-10 grid size-8 place-items-center self-center border transition-colors disabled:invisible"
            >
              <ArrowDownIcon className="size-4" />
            </button>
          </ThreadPrimitive.ScrollToBottom>
          <SpecimenComposer />
          <AuiIf condition={isNewChatView}>
            <div className="min-h-8">
              <AuiIf condition={(s) => s.composer.isEmpty}>
                <SpecimenSuggestions />
              </AuiIf>
            </div>
          </AuiIf>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

const SUGGESTIONS = [
  { label: "Weather in Tokyo", prompt: "What's the weather in Tokyo?" },
  {
    label: "Show a sales dashboard",
    prompt:
      "Use the present tool to show a compact sales dashboard: a Card with two Facts in a Row and a bar Chart of monthly sales.",
  },
  {
    label: "Compare React, Vue, and Svelte",
    prompt: "Compare React, Vue, and Svelte in a table",
  },
  {
    label: "Write a debounce function",
    prompt: "Write a debounce function in TypeScript",
  },
];

function SpecimenSuggestions(): ReactNode {
  return (
    <div className="animate-in fade-in mx-auto flex max-w-[30rem] flex-wrap items-center justify-center gap-2 duration-200">
      {SUGGESTIONS.map((suggestion) => (
        <ThreadPrimitive.Suggestion
          key={suggestion.prompt}
          prompt={suggestion.prompt}
          send
          className="border-foreground/10 bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground rounded-control h-8 border px-3 text-[13px] transition-colors"
        >
          {suggestion.label}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

function SpecimenComposer(): ReactNode {
  return (
    <ComposerPrimitive.Root className="w-full">
      <div className="border-foreground/10 bg-muted/25 focus-within:border-foreground/25 rounded-thread flex flex-col border transition-colors">
        <div className="has-[.aui-attachment-root]:px-3 has-[.aui-attachment-root]:pt-3">
          <ComposerAttachments />
        </div>
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder="Send a message..."
            rows={1}
            className="placeholder:text-muted-foreground field-sizing-content max-h-48 min-h-12 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-base leading-6 focus:outline-none"
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <ComposerPrimitive.AddAttachment asChild>
            <button
              type="button"
              aria-label="Add attachment"
              className="text-muted-foreground hover:text-foreground rounded-control grid size-8 place-items-center transition-colors"
            >
              <PlusIcon className="size-4.5" />
            </button>
          </ComposerPrimitive.AddAttachment>
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send asChild>
              <button
                type="button"
                aria-label="Send message"
                className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full transition-opacity disabled:opacity-40"
              >
                <ArrowUpIcon className="size-4.5" />
              </button>
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <ComposerPrimitive.Cancel asChild>
              <button
                type="button"
                aria-label="Stop generating"
                className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full"
              >
                <SquareIcon className="size-3.5 fill-current" />
              </button>
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function SpecimenUserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root
      data-role="user"
      className="animate-in fade-in slide-in-from-bottom-1 mx-auto flex w-full max-w-(--thread-max-width) flex-col items-end duration-150"
    >
      <div className="w-full has-[.aui-attachment-root]:mb-2">
        <UserMessageAttachments />
      </div>
      <div className="bg-muted rounded-thread max-w-[80%] px-4 py-2 text-[15px] wrap-break-word empty:hidden">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function SpecimenAssistantMessage(): ReactNode {
  return (
    <MessagePrimitive.Root
      data-role="assistant"
      className="animate-in fade-in slide-in-from-bottom-1 mx-auto w-full max-w-(--thread-max-width) duration-150"
    >
      <div className="text-[15px] leading-relaxed wrap-break-word">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") {
              if (part.text === "" && part.status?.type === "running")
                return <TraceLine live label="thinking" />;
              return <MarkdownText />;
            }
            if (part.type === "reasoning") return <Reasoning {...part} />;
            if (part.type === "tool-call")
              return part.toolUI ?? <SpecimenToolCall {...part} />;
            if (part.type === "data") return part.dataRendererUI;
            return null;
          }}
        </MessagePrimitive.Parts>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="border-destructive/60 text-destructive mt-2 border-l-2 pl-3 text-[12.5px]">
            <ErrorPrimitive.Message className="line-clamp-2" />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        className="mt-2 flex items-center gap-1.5"
      >
        <ActionBarPrimitive.Copy
          aria-label="Copy response"
          className="text-muted-foreground/70 hover:text-foreground p-1 transition-colors"
        >
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="size-4" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="size-4" />
          </AuiIf>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload
          aria-label="Regenerate response"
          className="text-muted-foreground/70 hover:text-foreground p-1 transition-colors"
        >
          <RefreshCwIcon className="size-4" />
        </ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function SpecimenToolCall({
  toolName,
  status,
}: ToolCallMessagePartProps): ReactNode {
  const isRunning = status?.type === "running";
  const duration = useToolDuration(isRunning);

  return (
    <TraceLine
      live={isRunning}
      label={isRunning ? "running" : "ran"}
      detail={toolName}
      {...(duration !== null ? { meta: formatDuration(duration) } : {})}
    />
  );
}
