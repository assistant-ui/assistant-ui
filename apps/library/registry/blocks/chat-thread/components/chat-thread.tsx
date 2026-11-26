"use client";

import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { File, getFileHref } from "@/components/assistant-ui/elements/file";
import { Image as MessageImage } from "@/components/assistant-ui/elements/image";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { MessageTiming } from "@/components/assistant-ui/elements/message-timing.aui";
import {
  ComposerMenu,
  ComposerModelItem,
  ComposerModelTrigger,
  type ComposerModel,
} from "@/components/assistant-ui/elements/composer";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
} from "@/components/assistant-ui/elements/reasoning.aui";
import { CollapsibleTrigger } from "@/components/assistant-ui/elements/collapsible-root";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  SuggestionPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  type FileMessagePartComponent,
  type ImageMessagePartComponent,
  type TextMessagePartComponent,
  useAui,
  useAuiState,
  useVoiceControls,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AudioLinesIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  LightbulbIcon,
  CopyIcon,
  DownloadIcon,
  MicIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  Loader2Icon,
  SquareIcon,
  PlayIcon,
  PlusIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Volume2Icon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react";

export type ThreadGroupPart = MessagePrimitive.GroupedParts.GroupPart;

/*
 * Message actions stay mounted and fade in while their message is hovered,
 * while one of them has keyboard focus, or while one of their menus is open.
 * On touch screens, which have no hover, they are always shown.
 */
const HOVER_REVEAL =
  "opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 group-has-[:focus-visible]/message:opacity-100 has-data-[state=open]:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none";

const shouldShowComposerResume = (s: AssistantState) =>
  !!s.thread.canResume && s.composer.type === "thread" && s.composer.isEmpty;

const reasoningDuration = (timing: ThreadGroupPart["timing"]) =>
  timing?.completedAt === undefined
    ? undefined
    : Math.round((timing.completedAt - timing.startedAt) / 1000);

/**
 * Optional component overrides for the thread. `AssistantMessage` and
 * `Welcome` replace whole sections; `ReasoningGroup` replaces the thinking
 * trace and `Indicator` the pending dot. `ComposerExtra` renders in the
 * composer's action row before the model picker.
 */
export type ChatThreadComponents = {
  AssistantMessage?: ComponentType | undefined;
  Welcome?: ComponentType | undefined;
  Indicator?: ComponentType | undefined;
  ReasoningGroup?:
    | ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>>
    | undefined;
  ComposerExtra?: ComponentType | undefined;
};

// Replies render Markdown and reasoning only; consecutive reasoning parts form
// one thinking trace. Tool calls and other parts are left for other blocks.
const messageGroupBy = groupPartByType({
  reasoning: ["group-reasoning"],
});

export type ChatThreadProps = {
  /** The name in the header above the thread. */
  title?: string | undefined;
  components?: ChatThreadComponents | undefined;
  autoFocus?: boolean | undefined;
};

const EMPTY_COMPONENTS: ChatThreadComponents = {};

const ChatThreadComponentsContext =
  createContext<ChatThreadComponents>(EMPTY_COMPONENTS);

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
    data-slot="aui_thread-history-skeleton"
    role="status"
    className="animate-in fade-in fill-mode-both flex flex-col gap-y-6 [animation-delay:150ms] [animation-duration:200ms]"
  >
    <span className="sr-only">Loading conversation</span>
    <Skeleton className="ml-auto h-9 w-2/5 rounded-xl motion-reduce:animate-none" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-4/5 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-3/5 motion-reduce:animate-none" />
    </div>
    <Skeleton className="ml-auto h-9 w-1/3 rounded-xl motion-reduce:animate-none" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-10/12 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
    </div>
  </div>
);

/**
 * The chat thread block: a header with a new-chat button over a full thread,
 * built from assistant-ui primitives and elements in this file so it can be
 * restyled without touching the shared thread.
 */
export const ChatThread: FC<ChatThreadProps> = ({
  title = "Chat",
  components = EMPTY_COMPONENTS,
  autoFocus = true,
}) => {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ChatThreadComponentsContext.Provider value={components}>
      <div className="bg-background text-foreground relative flex h-full min-h-0 flex-col">
        {/* The header floats over the thread, so messages scroll under the glass. */}
        <header className="border-border/60 bg-background/70 supports-[backdrop-filter]:bg-background/60 absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b px-4 backdrop-blur-xl backdrop-saturate-150">
          <h1 className="text-sm font-medium">{title}</h1>
          <ThreadListPrimitive.New asChild>
            <TooltipIconButton tooltip="New chat" variant="ghost">
              <PlusIcon strokeWidth={1.75} />
            </TooltipIconButton>
          </ThreadListPrimitive.New>
        </header>
        <div className="min-h-0 flex-1">
          <ThreadRoot isEmpty={isEmpty} autoFocus={autoFocus} />
        </div>
      </div>
    </ChatThreadComponentsContext.Provider>
  );
};

const ThreadRoot: FC<{ isEmpty: boolean; autoFocus: boolean }> = ({
  isEmpty,
  autoFocus,
}) => {
  const { Welcome = ThreadWelcome } = useContext(ChatThreadComponentsContext);

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-bg" as string]: "var(--color-background)",
        ["--composer-radius" as string]: "1rem",
        ["--composer-padding" as string]: "8px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        // The user message root gets 3rem of header clearance (see
        // HEADER_CLEARANCE), so grow the clamp by the same amount.
        topAnchorMessageClamp={{ tallerThan: "13em", visibleHeight: "9em" }}
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-16",
            isEmpty && "justify-center",
          )}
        >
          <AuiIf condition={isNewChatView}>
            <Welcome />
          </AuiIf>
          <AuiIf condition={isHistoryLoadingView}>
            <ThreadHistorySkeleton />
          </AuiIf>

          <ThreadLoadEarlier />

          <div
            data-slot="aui_message-group"
            className="mb-4 flex flex-col gap-y-6 empty:hidden"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter
            className={cn(
              "aui-thread-viewport-footer bg-background flex flex-col gap-4 overflow-visible pb-4 md:pb-6",
              !isEmpty &&
                "sticky bottom-0 mt-auto rounded-t-(--composer-radius)",
            )}
          >
            <ThreadScrollToBottom />
            <ThreadFollowUps />
            <Composer autoFocus={autoFocus} />
            <AuiIf condition={isNewChatView}>
              <ThreadSuggestions />
            </AuiIf>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } =
    useContext(ChatThreadComponentsContext);
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  const isSpoken = useAuiState((s) => s.message.metadata.modality === "voice");

  if (isEditing) return <EditComposer />;
  if (isSpoken) return <SpokenMessage />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessageComponent />;
};

type VoiceRunPosition = "single" | "start" | "middle" | "end";

const useVoiceRunPosition = (): VoiceRunPosition =>
  useAuiState((s) => {
    const before =
      s.thread.messages[s.message.index - 1]?.metadata.modality === "voice";
    const after =
      s.thread.messages[s.message.index + 1]?.metadata.modality === "voice";
    if (before) return after ? "middle" : "end";
    return after ? "start" : "single";
  });

const SpokenText: TextMessagePartComponent = ({ text }) => (
  <p className="aui-spoken-message-text m-0">{text}</p>
);

const SpokenMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const position = useVoiceRunPosition();
  const isSpeaking = useAuiState(
    (s) =>
      s.message.role === "assistant" && s.message.status?.type === "running",
  );
  const opensExchange = position === "start" || position === "single";

  return (
    <MessagePrimitive.Root
      data-slot="aui_spoken-message-root"
      data-role={role}
      data-voice-run={position}
      className={cn(
        "aui-spoken-message group/message bg-muted/40 mx-2 px-3 py-1.5 [contain-intrinsic-size:auto_48px] [content-visibility:auto]",
        position === "single" && "rounded-xl py-2",
        position === "start" && "rounded-t-xl pt-2",
        position === "middle" && "-mt-6",
        position === "end" && "-mt-6 rounded-b-xl pb-2",
      )}
    >
      {opensExchange && (
        <div
          data-slot="aui_spoken-exchange-header"
          className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs"
        >
          <PhoneIcon className="size-3" aria-hidden />
          <span>Voice conversation</span>
        </div>
      )}
      <div
        data-slot="aui_spoken-message-content"
        className="text-foreground flex items-start gap-2 text-sm leading-relaxed"
      >
        <span className="text-muted-foreground mt-1 shrink-0" aria-hidden>
          {role === "user" ? (
            <MicIcon className="size-3.5" />
          ) : (
            <AudioLinesIcon className="size-3.5" />
          )}
        </span>
        <span className="sr-only">
          {role === "user" ? "You said" : "Assistant said"}
        </span>
        <div className="min-w-0 flex-1 wrap-break-word">
          <MessagePrimitive.Parts components={{ Text: SpokenText }} />
          {isSpeaking && (
            <span
              data-slot="aui_spoken-message-indicator"
              role="status"
              className="text-muted-foreground ms-1 animate-pulse font-sans"
              aria-label="Assistant is speaking"
            >
              ●
            </span>
          )}
        </div>
        <SpokenActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const SpokenActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="never"
      className={cn(
        "aui-spoken-action-bar text-muted-foreground flex shrink-0 gap-1",
        HOVER_REVEAL,
      )}
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy" className="size-6">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
    </ActionBarPrimitive.Root>
  );
};

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']):not([disabled])";

const nextFocusable = (start: Element) => {
  for (
    let element = start.nextElementSibling;
    element;
    element = element.nextElementSibling
  ) {
    const target = element.matches(FOCUSABLE_SELECTOR)
      ? element
      : element.querySelector(FOCUSABLE_SELECTOR);
    if (target instanceof HTMLElement) return target;
  }
  return null;
};

const ThreadLoadEarlier: FC = () => {
  const visible = useAuiState(
    (s) => s.thread.hasEarlier || s.thread.isLoadingEarlier,
  );
  const loading = useAuiState((s) => s.thread.isLoadingEarlier);
  const slotRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<Element | null>(null);

  // The last page removes the button; a keyboard user on it continues from the
  // next control in tab order rather than from the document body.
  useLayoutEffect(() => {
    const focused = focusedRef.current;
    const slot = slotRef.current;
    if (visible || !focused || focused.isConnected || !slot) return;
    focusedRef.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    nextFocusable(slot)?.focus();
  }, [visible]);

  return (
    <div
      ref={slotRef}
      className="contents"
      onFocus={(event) => {
        focusedRef.current = event.target;
      }}
    >
      <span role="status" className="sr-only">
        {loading ? "Loading earlier messages" : ""}
      </span>
      {visible && (
        <ThreadPrimitive.LoadEarlier asChild>
          <Button
            variant="ghost"
            size="sm"
            data-slot="aui_thread-load-earlier"
            className="aui-thread-load-earlier text-muted-foreground mb-6 self-center rounded-full"
          >
            <span
              className={cn(loading && "shimmer motion-reduce:animate-none")}
            >
              {loading ? "Loading earlier messages" : "Load earlier messages"}
            </span>
          </Button>
        </ThreadPrimitive.LoadEarlier>
      )}
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-2">
      <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-center text-2xl font-medium tracking-tight duration-200">
        How can I help you today?
      </p>
    </div>
  );
};

/**
 * Follow-up chips: after a reply settles, the runtime's suggestions for what
 * to ask next sit as pills right above the composer. Clicking one sends it.
 */
const ThreadFollowUps: FC = () => {
  const suggestions = useAuiState((s) => s.thread.suggestions);
  const visible = useAuiState(
    (s) =>
      !s.thread.isEmpty &&
      !s.thread.isRunning &&
      s.thread.suggestions.length > 0,
  );
  if (!visible) return null;

  return (
    <div
      data-slot="aui_thread-follow-ups"
      className="fade-in animate-in flex flex-wrap gap-1.5 duration-200 motion-reduce:animate-none"
    >
      {suggestions.map((suggestion) => (
        <ThreadPrimitive.Suggestion
          key={suggestion.prompt}
          prompt={suggestion.prompt}
          send
          className="aui-thread-follow-up bg-background border-border/60 hover:bg-accent flex h-8 items-center rounded-full border px-3.5 text-sm leading-5 transition-colors outline-none motion-reduce:transition-none"
        >
          {suggestion.title ?? suggestion.prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

// Typing hides the suggestions but keeps their space, so the centered
// welcome and composer stay put instead of jumping as the draft starts.
const ThreadSuggestions: FC = () => {
  const hidden = useAuiState((s) => !s.composer.isEmpty);
  return (
    <div
      className={cn(
        "aui-thread-welcome-suggestions flex w-full flex-col transition-opacity duration-150 motion-reduce:transition-none",
        hidden && "invisible opacity-0",
      )}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
    >
      <ThreadPrimitive.Suggestions>
        {() => <ThreadSuggestionItem />}
      </ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send asChild>
        <button
          type="button"
          className="aui-thread-welcome-suggestion group hover:bg-foreground/[0.03] focus-visible:ring-ring/50 flex w-full items-baseline gap-2.5 rounded-md px-2 py-2 text-start text-sm transition-colors outline-none focus-visible:ring-1 motion-reduce:transition-none"
        >
          <span
            aria-hidden
            className="text-muted-foreground/60 group-hover:text-foreground font-mono text-xs transition-colors motion-reduce:transition-none"
          >
            {">"}
          </span>
          <span className="min-w-0 flex-1 truncate">
            <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 text-foreground" />{" "}
            <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
          </span>
        </button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

type ChatModel = ComposerModel & { id: string };

// The OpenAI models the block's /api/chat route can serve. The chosen id rides
// along on each run's config as `modelName`, ready to pass to `openai(...)`.
const MODELS: readonly [ChatModel, ...ChatModel[]] = [
  { id: "gpt-6-luna", name: "GPT-6 Luna", meta: "gpt-6-luna" },
  { id: "gpt-6-astra", name: "GPT-6 Astra", meta: "gpt-6-astra" },
];

const COMPOSER_ICON_BUTTON =
  "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/15 dark:hover:bg-muted-foreground/30 size-7 shrink-0 rounded-full active:scale-[0.96] motion-reduce:transition-none [&_svg]:size-4";

const COMPOSER_PRIMARY_BUTTON =
  "size-7 shrink-0 rounded-full active:scale-[0.96] motion-reduce:transition-none [&_svg]:size-4";

/**
 * A one-line bar: attach on the left, the input in the middle, then the model
 * picker, dictation, and one round primary button that sends, stops, or
 * starts a voice conversation. Attachments and long drafts grow it upward.
 */
const Composer: FC<{ autoFocus: boolean }> = ({ autoFocus }) => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="aui_composer-shell"
          className="border-foreground/[0.06] data-[dragging=true]:border-ring flex w-full cursor-text flex-col gap-2 rounded-[1.5rem] border bg-(--composer-bg) p-(--composer-padding) shadow-[0_1px_2px_oklch(0_0_0/4%)] transition-[border-color] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))]"
        >
          <ComposerAttachments />
          <div
            data-slot="aui_composer-bar"
            className="flex w-full items-end gap-1.5"
          >
            <ComposerAttach />
            <ComposerPrimitive.Input
              placeholder="Ask anything"
              className="aui-composer-input caret-primary placeholder:text-muted-foreground/60 max-h-48 min-h-7 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-0.5 text-base text-sm leading-6 outline-none"
              rows={1}
              autoFocus={autoFocus}
              enterKeyHint="send"
              aria-label="Message input"
            />
            <ComposerAction />
          </div>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAttach: FC = () => (
  <ComposerPrimitive.AddAttachment
    render={
      <TooltipIconButton
        tooltip="Add files"
        side="bottom"
        variant="ghost"
        size="icon"
        className={cn("aui-composer-add-attachment", COMPOSER_ICON_BUTTON)}
        aria-label="Add files"
      />
    }
  >
    <PlusIcon className="aui-attachment-add-icon" />
  </ComposerPrimitive.AddAttachment>
);

/**
 * The composer's model pill: the active model's name, opening a short list
 * above the bar. The choice is registered into assistant-ui's model context,
 * so it reaches the next run.
 */
const ComposerModelPicker: FC = () => {
  const aui = useAui();
  const [selected, setSelected] = useState<ChatModel>(MODELS[0]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      aui.modelContext.register({
        getModelContext: () => ({ config: { modelName: selected.id } }),
      }),
    [aui, selected],
  );

  // The menu leaves closing to its owner: an outside press or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="aui-composer-model-picker relative">
      <ComposerModelTrigger
        model={selected.name}
        open={open}
        aria-haspopup="menu"
        aria-label={`Model: ${selected.name}`}
        className="h-7 px-2.5"
        onClick={() => setOpen((value) => !value)}
      />
      <ComposerMenu
        open={open}
        align="end"
        role="menu"
        aria-label="Models"
        aria-hidden={!open || undefined}
        inert={!open || undefined}
        className="w-64"
      >
        {MODELS.map((entry) => (
          <ComposerModelItem
            key={entry.id}
            entry={entry}
            selected={entry.id === selected.id}
            role="menuitemradio"
            aria-checked={entry.id === selected.id}
            onClick={() => {
              setSelected(entry);
              setOpen(false);
            }}
          />
        ))}
      </ComposerMenu>
    </div>
  );
};

const ComposerVoice: FC = () => {
  const { connect } = useVoiceControls();
  return (
    <TooltipIconButton
      tooltip="Start voice"
      side="bottom"
      type="button"
      variant="default"
      size="icon"
      className={cn("aui-composer-voice", COMPOSER_PRIMARY_BUTTON)}
      aria-label="Start voice conversation"
      onClick={() => connect()}
    >
      <AudioLinesIcon />
    </TooltipIconButton>
  );
};

// An empty draft on a runtime with voice offers a voice conversation in the
// send button's place, the way a spoken turn would start.
const showsVoiceStart = (s: AssistantState) =>
  s.thread.capabilities.voice &&
  s.thread.voice === undefined &&
  s.composer.isEmpty &&
  !s.thread.isRunning;

const ComposerAction: FC = () => {
  const { ComposerExtra } = useContext(ChatThreadComponentsContext);
  // The stop control only cancels the send while no run it could stop is going.
  const isSending = useAuiState(
    (s) =>
      s.composer.submission !== undefined &&
      !(s.thread.isRunning && s.thread.capabilities.cancel),
  );

  return (
    <div className="aui-composer-action-wrapper flex shrink-0 items-center gap-1.5">
      {ComposerExtra && <ComposerExtra />}
      <ComposerModelPicker />
      <AuiIf condition={(s) => s.thread.capabilities.dictation}>
        <AuiIf condition={(s) => s.composer.dictation == null}>
          <ComposerPrimitive.Dictate asChild>
            <TooltipIconButton
              tooltip="Dictate"
              side="bottom"
              type="button"
              variant="ghost"
              size="icon"
              className={cn("aui-composer-dictate", COMPOSER_ICON_BUTTON)}
              aria-label="Start voice input"
            >
              <MicIcon className="aui-composer-dictate-icon" />
            </TooltipIconButton>
          </ComposerPrimitive.Dictate>
        </AuiIf>
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <ComposerPrimitive.StopDictation asChild>
            <TooltipIconButton
              tooltip="Stop dictation"
              side="bottom"
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "aui-composer-stop-dictation",
                COMPOSER_ICON_BUTTON,
                "text-destructive hover:text-destructive",
              )}
              aria-label="Stop voice input"
            >
              <SquareIcon className="aui-composer-stop-dictation-icon size-3.5! animate-pulse fill-current" />
            </TooltipIconButton>
          </ComposerPrimitive.StopDictation>
        </AuiIf>
      </AuiIf>
      <AuiIf condition={showsVoiceStart}>
        <ComposerVoice />
      </AuiIf>
      <AuiIf
        condition={(s) =>
          (!s.composer.canCancel ||
            (s.thread.voice !== undefined &&
              s.composer.submission === undefined)) &&
          !shouldShowComposerResume(s) &&
          !showsVoiceStart(s)
        }
      >
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="button"
            variant="default"
            size="icon"
            className={cn("aui-composer-send", COMPOSER_PRIMARY_BUTTON)}
            aria-label="Send message"
          >
            <ArrowUpIcon className="aui-composer-send-icon" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={shouldShowComposerResume}>
        <ComposerPrimitive.Resume asChild>
          <TooltipIconButton
            tooltip="Resume generating"
            side="bottom"
            type="button"
            variant="default"
            size="icon"
            className={cn("aui-composer-resume", COMPOSER_PRIMARY_BUTTON)}
            aria-label="Resume generating"
          >
            <PlayIcon className="aui-composer-resume-icon" />
          </TooltipIconButton>
        </ComposerPrimitive.Resume>
      </AuiIf>
      <AuiIf
        condition={(s) =>
          s.composer.canCancel &&
          (s.thread.voice === undefined || s.composer.submission !== undefined)
        }
      >
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className={cn("aui-composer-cancel", COMPOSER_PRIMARY_BUTTON)}
            aria-label={isSending ? "Cancel sending" : "Stop generating"}
          >
            <SquareIcon className="aui-composer-cancel-icon size-3.5! fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root group/error border-destructive/20 bg-destructive/5 text-destructive data-[run-state=in-progress]:border-border data-[run-state=in-progress]:bg-muted/40 data-[run-state=in-progress]:text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 text-sm leading-5 data-[run-state=stale]:border-amber-500/40 data-[run-state=stale]:bg-amber-500/10 data-[run-state=stale]:text-amber-800 dark:text-red-200 dark:data-[run-state=stale]:bg-amber-500/5 dark:data-[run-state=stale]:text-amber-200">
        <TriangleAlertIcon className="size-4 shrink-0 group-data-[run-state=in-progress]/error:hidden" />
        <Loader2Icon className="hidden size-4 shrink-0 animate-spin group-data-[run-state=in-progress]/error:block motion-reduce:animate-none" />
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2 min-w-0 flex-1" />
        <ActionBarPrimitive.Resume asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-amber-500/40 bg-transparent hover:bg-amber-500/15 disabled:hidden dark:border-amber-400/30"
          >
            <PlayIcon className="size-3.5" />
            Resume
          </Button>
        </ActionBarPrimitive.Resume>
        <ActionBarPrimitive.RefreshRun asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 disabled:hidden"
          >
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>
        </ActionBarPrimitive.RefreshRun>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

/**
 * The thinking trace: one muted line that opens. While the model thinks it
 * shows a lightbulb and a shimmering "Thinking"; once done, a check and how
 * long it took. Opened, the thoughts sit under a hairline beside the icon.
 */
const ThreadReasoning: FC<PropsWithChildren<{ group: ThreadGroupPart }>> = ({
  group,
  children,
}) => {
  const running = group.status.type === "running";
  const duration = reasoningDuration(group.timing);
  const TraceIcon = running ? LightbulbIcon : CircleCheckIcon;

  return (
    <ReasoningRoot variant="ghost" streaming={running} className="mb-3">
      <CollapsibleTrigger
        data-slot="reasoning-trigger"
        className="aui-reasoning-trigger group/trigger text-muted-foreground hover:text-foreground flex w-fit max-w-full min-w-0 items-center gap-1 text-start text-sm leading-5 transition-colors outline-none motion-reduce:transition-none"
      >
        <span className="flex min-w-0 items-center gap-2">
          <TraceIcon aria-hidden className="size-4 shrink-0" />
          <span
            className={cn(
              "min-w-0 truncate tabular-nums",
              running && "shimmer motion-reduce:animate-none",
            )}
          >
            {running
              ? "Thinking"
              : duration
                ? `Thought for ${duration}s`
                : "Thought it through"}
          </span>
        </span>
        <ChevronRightIcon
          aria-hidden
          className="size-3.5 shrink-0 transition-transform duration-150 group-data-open/trigger:rotate-90 group-data-panel-open/trigger:rotate-90 motion-reduce:transition-none rtl:rotate-180"
        />
      </CollapsibleTrigger>
      <ReasoningContent
        aria-busy={running}
        className="[&>[data-slot=reasoning-fade]:first-child]:hidden"
      >
        <ReasoningText className="border-border/60 ms-2 mt-2 border-s py-0 ps-4 text-sm leading-5">
          {children}
        </ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

const AssistantMessage: FC = () => {
  const { Indicator, ReasoningGroup } = useContext(ChatThreadComponentsContext);

  const ACTION_BAR_PT = "pt-1.5";
  // Keep the action bar inside the contained root's paint box, then cancel its reserved space in flow.
  const ACTION_BAR_HEIGHT = `min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="group/message fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 pb-7.5 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="text-foreground px-2 leading-relaxed wrap-break-word"
      >
        <MessagePrimitive.GroupedParts groupBy={messageGroupBy}>
          {({ part, children }) => {
            switch (part.type) {
              case "group-reasoning": {
                if (ReasoningGroup) {
                  return (
                    <ReasoningGroup group={part}>{children}</ReasoningGroup>
                  );
                }
                return (
                  <ThreadReasoning group={part}>{children}</ThreadReasoning>
                );
              }
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "indicator":
                return Indicator ? (
                  <Indicator />
                ) : (
                  <span
                    data-slot="aui_assistant-message-indicator"
                    className="animate-pulse font-sans"
                    aria-label="Assistant is working"
                  >
                    {"●"}
                  </span>
                );
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className={cn("ms-2 flex items-center", ACTION_BAR_HEIGHT)}
      >
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

/*
 * The More menu, styled like the library's menu: a glass surface (solid
 * popover where blur is unsupported or transparency is reduced) with a lift
 * shadow, a 10px radius, 4px padding, and 28px rows with a 6px radius.
 */
const MENU_CONTENT = cn(
  "border-border/60 text-popover-foreground z-50 flex min-w-50 origin-(--radix-dropdown-menu-content-transform-origin) flex-col overflow-y-auto rounded-[10px] border p-1 font-sans text-sm/5 font-normal outline-none",
  "bg-[color-mix(in_oklab,var(--color-popover)_72%,transparent)] backdrop-blur-[16px]",
  "[--accent:color-mix(in_oklab,var(--foreground)_7%,transparent)] [--muted-foreground:color-mix(in_oklab,var(--foreground)_62%,transparent)]",
  "not-supports-[backdrop-filter:blur(1px)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none",
  "shadow-[0_1px_2px_oklch(0_0_0/6%),0_8px_24px_-6px_oklch(0_0_0/14%)] dark:shadow-[0_1px_2px_oklch(0_0_0/30%),0_8px_24px_-6px_oklch(0_0_0/50%)]",
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.96] data-[state=open]:duration-150",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.96] data-[state=closed]:duration-100",
  "motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=open]:zoom-in-100",
);

const MENU_ROW = cn(
  "relative flex h-7 cursor-pointer items-center gap-2 rounded-[6px] px-2 outline-none select-none pointer-coarse:h-9",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg:not([class*='text-'])]:text-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="never"
      className={cn(
        "aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ms-1 flex gap-1",
        HOVER_REVEAL,
      )}
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <AuiIf condition={(s) => s.thread.capabilities.speech}>
        <AuiIf condition={(s) => s.message.speech == null}>
          <ActionBarPrimitive.Speak asChild>
            <TooltipIconButton tooltip="Read aloud">
              <Volume2Icon />
            </TooltipIconButton>
          </ActionBarPrimitive.Speak>
        </AuiIf>
        <AuiIf condition={(s) => s.message.speech != null}>
          <ActionBarPrimitive.StopSpeaking asChild>
            <TooltipIconButton tooltip="Stop reading">
              <SquareIcon className="size-3.5! fill-current" />
            </TooltipIconButton>
          </ActionBarPrimitive.StopSpeaking>
        </AuiIf>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.capabilities.feedback}>
        <ActionBarPrimitive.FeedbackPositive asChild>
          <TooltipIconButton
            tooltip="Helpful"
            className="data-[submitted=true]:bg-accent data-[submitted=true]:text-accent-foreground"
          >
            <ThumbsUpIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.FeedbackPositive>
        <ActionBarPrimitive.FeedbackNegative asChild>
          <TooltipIconButton
            tooltip="Not helpful"
            className="data-[submitted=true]:bg-accent data-[submitted=true]:text-accent-foreground"
          >
            <ThumbsDownIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.FeedbackNegative>
      </AuiIf>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className={cn("aui-action-bar-more-content", MENU_CONTENT)}
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item
              className={cn("aui-action-bar-more-item", MENU_ROW)}
            >
              <DownloadIcon />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
      <MessageTiming side="top" className="h-7 px-1.5" />
    </ActionBarPrimitive.Root>
  );
};

const MessageFile: FileMessagePartComponent = (part) => {
  const image =
    typeof part.mimeType === "string" &&
    typeof part.data === "string" &&
    part.mimeType.toLowerCase().startsWith("image/")
      ? getFileHref(part.data, part.mimeType, part.sourceType)
      : null;
  if (!image) return <File {...part} />;
  return (
    <MessageImage
      type="image"
      image={image}
      status={part.status}
      {...(typeof part.filename === "string" && { filename: part.filename })}
    />
  );
};

const UserFilePart: FileMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-file" className="py-1">
    <MessageFile {...part} />
  </div>
);

const UserImagePart: ImageMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-image" className="py-1">
    <MessageImage {...part} />
  </div>
);

// turnAnchor="top" scrolls the new user message to the very top of the
// viewport, which sits under the glass header. Padding the root by the header
// height (and pulling it back with a matching negative margin) moves that
// anchor point above the bubble, so the question lands just below the header.
// The padding overlaps the previous reply, so it ignores the pointer.
const HEADER_CLEARANCE =
  "-mt-12 pt-12 pointer-events-none [&>*]:pointer-events-auto";

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className={cn(
        HEADER_CLEARANCE,
        "group/message fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto] [&:where(>*)]:col-start-2",
      )}
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-muted text-foreground rounded-(--composer-radius) px-4 py-2 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts
            components={{ File: UserFilePart, Image: UserImagePart }}
          />
        </div>
        <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="never"
      className={cn(
        "aui-user-action-bar-root text-muted-foreground flex items-center gap-1",
        HOVER_REVEAL,
      )}
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy" className="aui-user-action-copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root border-foreground/[0.06] ms-auto flex w-full max-w-[85%] cursor-text flex-col rounded-(--composer-radius) border bg-(--composer-bg) transition-[border-color]">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" className="h-8 px-3">
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
