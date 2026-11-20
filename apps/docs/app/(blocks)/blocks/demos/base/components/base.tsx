"use client";

import { useState, type FC, type ReactNode } from "react";
import Image from "next/image";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SelectionToolbarPrimitive,
  ThreadPrimitive,
  type ToolCallMessagePartProps,
  type Unstable_SlashCommand,
  unstable_useMentionAdapter,
  unstable_useSlashCommandAdapter,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  LexicalComposerInput,
  type DirectiveChipProps,
} from "@assistant-ui/react-lexical";
import {
  Analytics01Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Download01Icon,
  File01Icon,
  Globe02Icon,
  HelpCircleIcon,
  Idea01Icon,
  LanguageSkillIcon,
  Menu01Icon,
  Mic01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  QuillWrite01Icon,
  QuoteDownIcon,
  RefreshIcon,
  Share08Icon,
  SidebarLeftIcon,
  SlashIcon,
  SourceCodeIcon,
  StopIcon,
  SunCloud01Icon,
  Tick02Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { ComposerTriggerPopover } from "@/components/assistant-ui/elements/composer-trigger-popover.aui";
import { DirectiveText } from "@/components/assistant-ui/elements/directive-text.aui";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { MessageTiming } from "@/components/assistant-ui/elements/message-timing.aui";
import { ModelSelector } from "@/components/assistant-ui/elements/model-selector.aui";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import { useDocsModelOptions } from "@/components/pages/docs/assistant/docs-model-options";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_MODEL_ID } from "@/lib/model";
import { cn } from "@/lib/utils";
import logo from "@/public/favicon/icon.svg";
import {
  actionBar,
  chip,
  field,
  floating,
  Icon,
  iconButton,
  iconComponent,
  iconSwap,
  iconSwapIn,
  iconSwapOut,
  inkButton,
  menu,
  menuItem,
  paper,
  quote,
  rItem,
  rSurface,
  textButton,
  textControl,
  textReading,
  Tip,
  TraceChevron,
  traceDetail,
  traceTrigger,
} from "./design";
import { ThreadShell } from "./thread-shell";

type GroupPart = MessagePrimitive.GroupedParts.GroupPart;

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

const Logo: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => (
  <div
    className={cn(
      "flex items-center font-medium",
      textControl,
      collapsed ? "size-8 shrink-0 justify-center" : "min-w-0 gap-2 px-1.5",
    )}
  >
    <Image
      src={logo}
      alt=""
      className="size-5 shrink-0 dark:hue-rotate-180 dark:invert"
    />
    {!collapsed && <span className="truncate">assistant-ui</span>}
  </div>
);

const ThreadTitle: FC = () => {
  const title = useAuiState(
    (s) =>
      s.threads.threadItems.find((t) => t.id === s.threads.mainThreadId)?.title,
  );
  return (
    <h1 className={cn("min-w-0 truncate font-medium", textControl)}>
      {title ?? "New chat"}
    </h1>
  );
};

const Header: FC<{
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}> = ({ sidebarCollapsed, onToggleSidebar, onOpenMobileSidebar }) => (
  <header className="flex h-12 shrink-0 items-center gap-1.5 px-3">
    <Tip label="Open the chat list">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        className={cn(iconButton, "md:hidden")}
      >
        <Icon icon={Menu01Icon} />
      </button>
    </Tip>
    <Tip label={sidebarCollapsed ? "Show the sidebar" : "Hide the sidebar"}>
      <button
        type="button"
        aria-pressed={!sidebarCollapsed}
        onClick={onToggleSidebar}
        className={cn(iconButton, "hidden md:flex")}
      >
        <Icon icon={SidebarLeftIcon} />
      </button>
    </Tip>
    <ThreadTitle />
    <Tip label="Share">
      <button type="button" disabled className={cn(iconButton, "ms-auto")}>
        <Icon icon={Share08Icon} />
      </button>
    </Tip>
  </header>
);

/* -------------------------------------------------------------------------- */
/* Thread                                                                     */
/* -------------------------------------------------------------------------- */

// Startup exposes a loading placeholder thread; treat it as a new chat so
// the composer mounts centered. Loads after startup keep the docked layout.
const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  (!s.thread.isLoading || s.threads.isLoading);

// A switched thread that is still fetching its history: skeleton, not welcome.
const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

const ThreadHistorySkeleton: FC = () => (
  <div
    role="status"
    className="animate-in fade-in fill-mode-both mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-y-6 [animation-delay:150ms] [animation-duration:200ms]"
  >
    <span className="sr-only">Loading conversation</span>
    <Skeleton
      className={cn("ms-auto h-9 w-2/5 motion-reduce:animate-none", rSurface)}
    />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-4/5 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-3/5 motion-reduce:animate-none" />
    </div>
  </div>
);

const Thread: FC = () => {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ThreadPrimitive.Root
      className="bg-background @container flex h-full flex-col"
      style={{ ["--thread-max-width" as string]: "42rem" }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className={cn(
          "relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4",
          isEmpty && "justify-center",
        )}
      >
        <AuiIf condition={isNewChatView}>
          <ThreadWelcome />
        </AuiIf>
        <AuiIf condition={isHistoryLoadingView}>
          <ThreadHistorySkeleton />
        </AuiIf>

        <div className="mx-auto mb-14 flex w-full max-w-(--thread-max-width) flex-col gap-8 empty:hidden">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.composer.isEditing) return <EditComposer />;
              if (message.role === "user") return <UserMessage />;
              return <AssistantMessage />;
            }}
          </ThreadPrimitive.Messages>
        </div>

        <ThreadPrimitive.ViewportFooter
          className={cn(
            "bg-background mx-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible pb-4",
            !isEmpty && "sticky bottom-0 mt-auto",
          )}
        >
          <Tip label="Scroll to the newest message">
            <ThreadPrimitive.ScrollToBottom
              className={cn(
                iconButton,
                paper,
                "absolute -top-10 self-center disabled:invisible",
              )}
            >
              <Icon icon={ArrowDown02Icon} />
            </ThreadPrimitive.ScrollToBottom>
          </Tip>
          <Composer />
          <AuiIf condition={isNewChatView}>
            <div className="min-h-19">
              <AuiIf condition={(s) => s.composer.isEmpty}>
                <ThreadSuggestions />
              </AuiIf>
            </div>
          </AuiIf>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>

      <SelectionToolbarPrimitive.Root
        className={cn(
          floating,
          "text-popover-foreground z-50 rounded-full p-0.5",
        )}
      >
        <SelectionToolbarPrimitive.Quote
          className={cn(textButton, "gap-1.5 px-3 hover:bg-(--glass-hover)")}
        >
          <Icon icon={QuoteDownIcon} className="size-3.5" />
          Quote
        </SelectionToolbarPrimitive.Quote>
      </SelectionToolbarPrimitive.Root>
    </ThreadPrimitive.Root>
  );
};

const ThreadWelcome: FC = () => (
  <div className="mx-auto mb-6 flex w-full max-w-(--thread-max-width) flex-col items-center px-2">
    <p className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-center text-2xl font-medium tracking-tight duration-200 motion-reduce:animate-none">
      How can I help you today?
    </p>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Suggestions: a row of topics, each opening a row of prompts                */
/* -------------------------------------------------------------------------- */

type SuggestionGroup = {
  label: string;
  icon: IconSvgElement;
  options: { label: string; prompt: string }[];
};

const SUGGESTION_GROUPS: SuggestionGroup[] = [
  {
    label: "Weather",
    icon: SunCloud01Icon,
    options: [
      {
        label: "in San Francisco",
        prompt: "What's the weather in San Francisco?",
      },
      { label: "in Singapore", prompt: "What's the weather in Singapore?" },
      { label: "in Tokyo", prompt: "What's the weather in Tokyo?" },
      { label: "in London", prompt: "What's the weather in London?" },
    ],
  },
  {
    label: "Code",
    icon: SourceCodeIcon,
    options: [
      {
        label: "explain React hooks",
        prompt: "Explain React hooks like useState and useEffect",
      },
      {
        label: "write a debounce function",
        prompt: "Write a debounce function in TypeScript",
      },
      {
        label: "review a useEffect cleanup",
        prompt: "Show me the right way to clean up a subscription in useEffect",
      },
    ],
  },
  {
    label: "Write",
    icon: QuillWrite01Icon,
    options: [
      {
        label: "a birthday card message",
        prompt:
          "Help me write a birthday card message for a friend in the notepad",
      },
      {
        label: "a product announcement",
        prompt: "Draft a short product announcement for a new dark mode",
      },
      {
        label: "release notes",
        prompt:
          "Write release notes for a bugfix release of a React component library",
      },
      {
        label: "a PR description",
        prompt:
          "Write a pull request description for a change that adds keyboard shortcuts",
      },
    ],
  },
  {
    label: "Analyze",
    icon: Analytics01Icon,
    options: [
      {
        label: "React vs Vue vs Svelte",
        prompt: "Compare React, Vue, and Svelte in a table",
      },
      {
        label: "GDP of US, China, Japan",
        prompt:
          "Compare the GDP of the United States, China, and Japan in a table",
      },
      {
        label: "pros and cons of SSR",
        prompt: "What are the pros and cons of server-side rendering?",
      },
    ],
  },
  {
    label: "Brainstorm",
    icon: Idea01Icon,
    options: [
      {
        label: "side project ideas",
        prompt: "Brainstorm five side project ideas for a React developer",
      },
      {
        label: "names for a dev tool",
        prompt: "Brainstorm names for a developer tools startup",
      },
      {
        label: "talk topics",
        prompt: "Brainstorm talk topics for a React meetup",
      },
    ],
  },
];

const ThreadSuggestions: FC = () => {
  const aui = useAui();
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const expandedGroup = SUGGESTION_GROUPS.find(
    (group) => group.label === expandedLabel,
  );

  const sendPrompt = (prompt: string) => {
    if (aui.thread.getState().isRunning) return;
    aui.thread.append({
      content: [{ type: "text", text: prompt }],
      runConfig: aui.composer.getState().runConfig,
    });
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="w-full [scrollbar-width:none] overflow-x-auto">
        <div className="mx-auto flex w-max items-center gap-1.5 px-1 py-0.5">
          {SUGGESTION_GROUPS.map((group) => (
            <button
              key={group.label}
              type="button"
              aria-expanded={group.label === expandedLabel}
              data-active={group.label === expandedLabel}
              className={chip}
              onClick={() =>
                setExpandedLabel(
                  group.label === expandedLabel ? null : group.label,
                )
              }
            >
              <Icon icon={group.icon} />
              {group.label}
            </button>
          ))}
        </div>
      </div>
      {expandedGroup && (
        <div
          key={expandedGroup.label}
          className="fade-in slide-in-from-top-1 animate-in w-full [scrollbar-width:none] overflow-x-auto duration-200 motion-reduce:animate-none"
        >
          <div className="mx-auto flex w-max items-center gap-1.5 px-1 py-0.5">
            {expandedGroup.options.map((option) => (
              <button
                key={option.label}
                type="button"
                className={chip}
                onClick={() => sendPrompt(option.prompt)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Composer: mentions with @ and commands with /                              */
/* -------------------------------------------------------------------------- */

const slashCommands: readonly Unstable_SlashCommand[] = [
  {
    id: "summarize",
    description: "Summarize the conversation",
    icon: "FileText",
    execute: () => console.log("[base block] /summarize invoked"),
  },
  {
    id: "translate",
    description: "Translate text to another language",
    icon: "Languages",
    execute: () => console.log("[base block] /translate invoked"),
  },
  {
    id: "search",
    description: "Search the web for information",
    icon: "Globe",
    execute: () => console.log("[base block] /search invoked"),
  },
  {
    id: "help",
    description: "List available commands",
    icon: "HelpCircle",
    execute: () => console.log("[base block] /help invoked"),
  },
];

const slashIconMap = {
  FileText: iconComponent(File01Icon),
  Languages: iconComponent(LanguageSkillIcon),
  Globe: iconComponent(Globe02Icon),
  HelpCircle: iconComponent(HelpCircleIcon),
};
const SlashFallbackIcon = iconComponent(SlashIcon);
const WrenchFallbackIcon = iconComponent(Wrench01Icon);

function DirectiveChip({
  directiveId,
  directiveType,
  label,
}: DirectiveChipProps) {
  return (
    <span
      className="aui-directive-chip"
      data-directive-type={directiveType}
      data-directive-id={directiveId}
    >
      {directiveType !== "command" && (
        <span className="aui-directive-chip-icon">
          <Icon icon={Wrench01Icon} className="size-3" />
        </span>
      )}
      <span className="aui-directive-chip-label">{label}</span>
    </span>
  );
}

/* The chip a mention or command becomes inside the input. */
const directiveChipStyles =
  "[&_.aui-directive-chip]:bg-foreground/6 [&_.aui-directive-chip]:text-foreground [&_.aui-directive-chip]:inline-flex [&_.aui-directive-chip]:items-baseline [&_.aui-directive-chip]:gap-1 [&_.aui-directive-chip]:rounded-full [&_.aui-directive-chip]:px-2 [&_.aui-directive-chip]:py-0.5 [&_.aui-directive-chip]:text-[13px] [&_.aui-directive-chip]:leading-none [&_.aui-directive-chip-icon]:self-center";

const ModelPicker: FC = () => {
  const models = useDocsModelOptions();
  return (
    <ModelSelector
      models={models}
      defaultValue={DEFAULT_MODEL_ID}
      variant="ghost"
      size="sm"
      className={cn("h-7 rounded-full px-2.5 font-normal", textControl)}
      contentClassName={menu}
    />
  );
};

const Composer: FC = () => {
  const mention = unstable_useMentionAdapter({
    fallbackIcon: WrenchFallbackIcon,
  });
  const slash = unstable_useSlashCommandAdapter({
    commands: slashCommands,
    iconMap: slashIconMap,
    fallbackIcon: SlashFallbackIcon,
  });

  return (
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root className="relative flex w-full flex-col">
        <ComposerPrimitive.AttachmentDropzone
          className={cn(
            paper,
            "data-[dragging=true]:border-ring flex w-full cursor-text flex-col gap-2 rounded-3xl p-2 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-colors data-[dragging=true]:border-dashed motion-reduce:transition-none",
          )}
        >
          <ComposerPrimitive.Quote className="flex items-start gap-2 px-2 pt-1.5">
            <ComposerPrimitive.QuoteText
              className={cn(quote, "line-clamp-2 flex-1")}
            />
            <Tip label="Remove the quote">
              <ComposerPrimitive.QuoteDismiss
                className={cn(iconButton, "-me-1 -mt-0.5 size-6")}
              >
                <Icon icon={Cancel01Icon} />
              </ComposerPrimitive.QuoteDismiss>
            </Tip>
          </ComposerPrimitive.Quote>
          <ComposerAttachments />
          <LexicalComposerInput
            directiveChip={DirectiveChip}
            placeholder="Send a message (@ to mention, / for commands)"
            className={cn(
              "[&_.aui-lexical-placeholder]:text-muted-foreground/50 relative max-h-48 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base leading-6 outline-none [&_.aui-lexical-input]:min-h-lh [&_.aui-lexical-input]:outline-none [&_.aui-lexical-placeholder]:pointer-events-none [&_.aui-lexical-placeholder]:absolute [&_.aui-lexical-placeholder]:inset-x-0 [&_.aui-lexical-placeholder]:top-0 [&_.aui-lexical-placeholder]:truncate [&_.aui-lexical-placeholder]:px-2 [&_.aui-lexical-placeholder]:py-1.5",
              directiveChipStyles,
            )}
          />
          <ComposerAction />
        </ComposerPrimitive.AttachmentDropzone>

        <ComposerTriggerPopover char="@" {...mention} />
        <ComposerTriggerPopover
          char="/"
          {...slash}
          emptyItemsLabel="No matching commands"
        />
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  );
};

const ComposerAction: FC = () => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-0.5">
      <Tip label="Add a file">
        <ComposerPrimitive.AddAttachment className={iconButton}>
          <Icon icon={Attachment01Icon} />
        </ComposerPrimitive.AddAttachment>
      </Tip>
      <ModelPicker />
    </div>
    <div className="flex items-center gap-1">
      <AuiIf condition={(s) => s.thread.capabilities.dictation}>
        <AuiIf condition={(s) => s.composer.dictation == null}>
          <Tip label="Dictate">
            <ComposerPrimitive.Dictate className={iconButton}>
              <Icon icon={Mic01Icon} />
            </ComposerPrimitive.Dictate>
          </Tip>
        </AuiIf>
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <Tip label="Stop dictating">
            <ComposerPrimitive.StopDictation
              className={cn(iconButton, "text-destructive")}
            >
              <Icon
                icon={StopIcon}
                className="animate-pulse fill-current motion-reduce:animate-none"
              />
            </ComposerPrimitive.StopDictation>
          </Tip>
        </AuiIf>
      </AuiIf>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <Tip label="Send the message">
          <ComposerPrimitive.Send className={inkButton}>
            <Icon icon={ArrowUp02Icon} />
          </ComposerPrimitive.Send>
        </Tip>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <Tip label="Stop the reply">
          <ComposerPrimitive.Cancel className={inkButton}>
            <Icon icon={StopIcon} className="size-3! fill-current" />
          </ComposerPrimitive.Cancel>
        </Tip>
      </AuiIf>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Assistant message                                                          */
/* -------------------------------------------------------------------------- */

const MessageError: FC = () => (
  <MessagePrimitive.Error>
    <ErrorPrimitive.Root
      className={cn(
        "border-destructive/20 text-destructive bg-destructive/5 mt-2 border px-3 py-2",
        rItem,
        textControl,
      )}
    >
      <ErrorPrimitive.Message className="line-clamp-2" />
    </ErrorPrimitive.Root>
  </MessagePrimitive.Error>
);

const WorkingIndicator: FC = () => {
  const connecting = useAuiState((s) => s.message.content.length === 0);
  return (
    <span
      role="status"
      className={cn(
        "text-muted-foreground shimmer motion-reduce:animate-none",
        textControl,
      )}
    >
      {connecting ? "Connecting" : "Writing"}
    </span>
  );
};

const seconds = (timing: GroupPart["timing"]) =>
  timing?.completedAt === undefined
    ? undefined
    : Math.max(1, Math.round((timing.completedAt - timing.startedAt) / 1000));

/** A trace line that expands into its children. */
const TraceGroup: FC<{
  icon: IconSvgElement;
  title: string;
  running: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}> = ({ icon, title, running, defaultOpen = false, children }) => {
  const [open, setOpen] = useState<boolean>();
  const isOpen = open ?? defaultOpen;

  return (
    <div className="flex flex-col gap-2 py-1">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        className={traceTrigger}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon
            icon={running ? icon : CheckmarkCircle02Icon}
            className="size-4 shrink-0"
          />
          <span
            className={cn(
              "min-w-0 truncate",
              running && "shimmer motion-reduce:animate-none",
            )}
          >
            {title}
          </span>
        </span>
        <TraceChevron open={isOpen} />
      </button>
      {isOpen && <div className={traceDetail}>{children}</div>}
    </div>
  );
};

const ToolLine: FC<ToolCallMessagePartProps> = (part) => {
  const running = part.result === undefined;
  if (part.status.type === "requires-action") return <ToolFallback {...part} />;

  return (
    <TraceGroup
      icon={Wrench01Icon}
      running={running}
      title={`${running ? "Running" : "Ran"} ${part.toolName}`}
    >
      <pre
        className={cn(
          field,
          "text-foreground overflow-x-auto px-3 py-2 font-mono text-xs leading-5",
          rItem,
        )}
      >
        {part.argsText}
        {running ? "" : `\n${JSON.stringify(part.result, null, 2)}`}
      </pre>
    </TraceGroup>
  );
};

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="group fade-in slide-in-from-bottom-1 animate-in relative flex flex-col items-start duration-150 motion-reduce:animate-none">
    <div
      className={cn("text-foreground w-full px-1 wrap-break-word", textReading)}
    >
      <MessagePrimitive.GroupedParts
        groupBy={groupPartByType({
          reasoning: ["group-chainOfThought", "group-reasoning"],
          "tool-call": ["group-chainOfThought", "group-tool"],
          "standalone-tool-call": [],
        })}
      >
        {({ part, children }) => {
          switch (part.type) {
            case "group-chainOfThought":
              return <div className="flex flex-col">{children}</div>;
            case "group-tool": {
              const running = part.status.type === "running";
              const count = part.indices.length;
              return (
                <TraceGroup
                  icon={Wrench01Icon}
                  running={running}
                  defaultOpen={part.counts.requiresAction > 0}
                  title={`${running ? "Running" : "Ran"} ${count} ${count === 1 ? "tool" : "tools"}`}
                >
                  {children}
                </TraceGroup>
              );
            }
            case "group-reasoning": {
              const running = part.status.type === "running";
              const took = seconds(part.timing);
              return (
                <TraceGroup
                  icon={Idea01Icon}
                  running={running}
                  title={
                    running
                      ? "Thinking"
                      : took
                        ? `Thought for ${took}s`
                        : "Thought it through"
                  }
                >
                  {children}
                </TraceGroup>
              );
            }
            case "text":
              return <MarkdownText />;
            case "reasoning":
              return (
                <p
                  className={cn(
                    "text-muted-foreground whitespace-pre-wrap",
                    textControl,
                  )}
                >
                  {part.text}
                </p>
              );
            case "tool-call":
              return part.toolUI ?? <ToolLine {...part} />;
            case "indicator":
              return <WorkingIndicator />;
            case "data":
              return part.dataRendererUI;
            default:
              return null;
          }
        }}
      </MessagePrimitive.GroupedParts>
      <MessageError />
    </div>

    <div className="absolute start-0 top-full flex items-center pt-0.5">
      <BranchPicker />
      <ActionBarPrimitive.Root hideWhenRunning className={actionBar}>
        <CopyButton />
        <Tip label="Regenerate">
          <ActionBarPrimitive.Reload className={iconButton}>
            <Icon icon={RefreshIcon} />
          </ActionBarPrimitive.Reload>
        </Tip>
        <ActionBarMorePrimitive.Root>
          <Tip label="More">
            <ActionBarMorePrimitive.Trigger
              className={cn(
                iconButton,
                "data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground/90",
              )}
            >
              <Icon icon={MoreHorizontalIcon} />
            </ActionBarMorePrimitive.Trigger>
          </Tip>
          <ActionBarMorePrimitive.Content
            side="bottom"
            align="start"
            sideOffset={4}
            className={menu}
          >
            <ActionBarPrimitive.ExportMarkdown asChild>
              <ActionBarMorePrimitive.Item className={menuItem}>
                <Icon icon={Download01Icon} />
                Export as Markdown
              </ActionBarMorePrimitive.Item>
            </ActionBarPrimitive.ExportMarkdown>
          </ActionBarMorePrimitive.Content>
        </ActionBarMorePrimitive.Root>
        <span className="text-muted-foreground ms-1 flex items-center text-xs tabular-nums">
          <MessageTiming />
        </span>
      </ActionBarPrimitive.Root>
    </div>
  </MessagePrimitive.Root>
);

/* -------------------------------------------------------------------------- */
/* User message and editing                                                   */
/* -------------------------------------------------------------------------- */

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="group fade-in slide-in-from-bottom-1 animate-in relative flex flex-col items-end gap-1.5 duration-150 motion-reduce:animate-none">
    <UserMessageAttachments />
    <MessagePrimitive.Quote>
      {({ text }) => (
        <blockquote className={cn(quote, "line-clamp-3 max-w-[80%]")}>
          {text}
        </blockquote>
      )}
    </MessagePrimitive.Quote>
    <div
      className={cn(
        "bg-muted max-w-[80%] px-3 py-1.5 wrap-break-word whitespace-pre-wrap empty:hidden",
        textReading,
        rSurface,
      )}
    >
      <MessagePrimitive.Parts components={{ Text: DirectiveText }} />
    </div>
    <div className="absolute end-0 top-full flex items-center pt-0.5">
      <BranchPicker />
      <ActionBarPrimitive.Root hideWhenRunning className={actionBar}>
        <Tip label="Edit">
          <ActionBarPrimitive.Edit className={iconButton}>
            <Icon icon={PencilEdit02Icon} />
          </ActionBarPrimitive.Edit>
        </Tip>
        <CopyButton />
      </ActionBarPrimitive.Root>
    </div>
  </MessagePrimitive.Root>
);

const EditComposer: FC = () => (
  <MessagePrimitive.Root className="flex justify-end">
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root
        className={cn(
          paper,
          "flex w-full max-w-[85%] flex-col gap-2 rounded-3xl p-2",
        )}
      >
        <LexicalComposerInput
          directiveChip={DirectiveChip}
          autoFocus
          className={cn(
            "min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base leading-6 outline-none [&_.aui-lexical-input]:min-h-lh [&_.aui-lexical-input]:outline-none",
            directiveChipStyles,
          )}
        />
        <div className="flex justify-end gap-1">
          <ComposerPrimitive.Cancel
            className={cn(
              textButton,
              "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            className={cn(
              textButton,
              "bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
            )}
          >
            Update
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  </MessagePrimitive.Root>
);

/* -------------------------------------------------------------------------- */
/* Copy and branch controls                                                   */
/* -------------------------------------------------------------------------- */

const CopyButton: FC = () => {
  const copied = useAuiState((s) => s.message.isCopied);
  return (
    <Tip label={copied ? "Copied" : "Copy"}>
      <ActionBarPrimitive.Copy
        className={cn(
          iconButton,
          "grid place-items-center",
          copied && "text-emerald-500",
        )}
      >
        <Icon
          icon={Copy01Icon}
          className={cn(iconSwap, copied ? iconSwapOut : iconSwapIn)}
        />
        <Icon
          icon={Tick02Icon}
          className={cn(iconSwap, copied ? iconSwapIn : iconSwapOut)}
        />
      </ActionBarPrimitive.Copy>
    </Tip>
  );
};

const BranchPicker: FC = () => (
  <BranchPickerPrimitive.Root
    hideWhenSingleBranch
    className="text-muted-foreground me-1 inline-flex items-center text-xs tabular-nums"
  >
    <Tip label="Previous version">
      <BranchPickerPrimitive.Previous className={iconButton}>
        <Icon icon={ArrowLeft01Icon} className="rtl:rotate-180" />
      </BranchPickerPrimitive.Previous>
    </Tip>
    <span>
      <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
    </span>
    <Tip label="Next version">
      <BranchPickerPrimitive.Next className={iconButton}>
        <Icon icon={ArrowRight01Icon} className="rtl:rotate-180" />
      </BranchPickerPrimitive.Next>
    </Tip>
  </BranchPickerPrimitive.Root>
);

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

export const Base: FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <TooltipProvider delay={300}>
      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] text-foreground h-full">
        <ThreadShell
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
          header={<Logo collapsed={sidebarCollapsed} />}
          sheetTitle={<Logo />}
        >
          <div className="flex h-full flex-col overflow-hidden p-2 md:ps-0">
            <div
              className={cn(
                paper,
                "flex flex-1 flex-col overflow-hidden",
                rSurface,
              )}
            >
              <Header
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              />
              <div className="flex-1 overflow-hidden">
                <Thread />
              </div>
            </div>
          </div>
        </ThreadShell>
      </div>
    </TooltipProvider>
  );
};
