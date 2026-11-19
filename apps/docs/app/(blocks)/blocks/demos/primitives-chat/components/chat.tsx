"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AssistantModalPrimitive,
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiConfig,
  AuiIf,
  BranchPickerPrimitive,
  ChainOfThoughtPrimitive,
  ComposerPrimitive,
  CompositeAttachmentAdapter,
  ErrorPrimitive,
  InMemoryThreadListAdapter,
  MessagePartPrimitive,
  MessagePrimitive,
  QueueItemPrimitive,
  SelectionToolbarPrimitive,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  SuggestionPrimitive,
  Suggestions,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  WebSpeechSynthesisAdapter,
  useAui,
  useAuiState,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type LocalRuntimeOptions,
  type SuggestionAdapter,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import {
  Add01Icon,
  Alert02Icon,
  Archive02Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  BubbleChatIcon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  Download01Icon,
  Image01Icon,
  LayoutAlignLeftIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PictureInPictureExitIcon,
  PictureInPictureOnIcon,
  QuoteDownIcon,
  RefreshIcon,
  SidebarLeftIcon,
  SunCloud01Icon,
  StopIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  Unarchive03Icon,
  VolumeHighIcon,
  VolumeMute02Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { usePanelRef, type Layout } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

/* -------------------------------------------------------------------------- */
/* Runtime: a scripted model, so the chat runs without a key or a server.     */
/* Replace `scriptedModel` with a real `ChatModelAdapter` to talk to a model. */
/* -------------------------------------------------------------------------- */

const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#e8e6df"/><circle cx="236" cy="62" r="26" fill="#d97757"/><path d="M0 180 96 84l58 58 44-36 122 74z" fill="#3d3d3a"/></svg>',
)}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function lastUserText(messages: readonly ThreadMessage[]) {
  const message = messages.findLast((entry) => entry.role === "user");
  return (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
}

async function* write(
  parts: ThreadAssistantMessagePart[],
  type: "text" | "reasoning",
  text: string,
  signal: AbortSignal,
): AsyncGenerator<ChatModelRunResult, void> {
  const index = parts.length;
  let shown = "";
  for (const word of text.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    shown += word;
    parts[index] = { type, text: shown };
    yield { content: [...parts] };
    await wait(40);
  }
}

const scriptedModel: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const prompt = lastUserText(messages).toLowerCase();
    const parts: ThreadAssistantMessagePart[] = [];
    await wait(400);

    if (/error|fail/.test(prompt)) {
      throw new Error(
        "The scripted model fails when a message mentions an error. Edit the message to get a reply.",
      );
    }

    if (/weather|tool|think/.test(prompt)) {
      yield* write(
        parts,
        "reasoning",
        "The question needs live data, so the weather tool runs first.",
        abortSignal,
      );
      const call = {
        type: "tool-call",
        toolCallId: crypto.randomUUID(),
        toolName: "get_weather",
        args: { city: "Tokyo" },
        argsText: '{ "city": "Tokyo" }',
      } as const;
      const index = parts.length;
      parts[index] = call;
      yield { content: [...parts] };
      await wait(900);
      parts[index] = { ...call, result: { temperature: "22°C", sky: "Clear" } };
      yield* write(
        parts,
        "reasoning",
        "The tool returned a reading, so the answer can be written.",
        abortSignal,
      );
      yield* write(
        parts,
        "text",
        "It is 22°C and clear in Tokyo. Open Thinking above to see the reasoning and the tool call.",
        abortSignal,
      );
      return;
    }

    if (/image|picture|draw/.test(prompt)) {
      yield* write(parts, "text", "Here is a small picture.", abortSignal);
      parts.push({ type: "image", image: SAMPLE_IMAGE });
      yield { content: [...parts] };
      return;
    }

    yield* write(
      parts,
      "text",
      "This reply comes from a script inside the file. Select part of it to quote it, press Regenerate to add a branch, or send another message while this one is still being written to see the queue.",
      abortSignal,
    );
  },
};

class ScriptedThreadList extends InMemoryThreadListAdapter {
  override async generateTitle(
    _remoteId?: string,
    messages: readonly ThreadMessage[] = [],
  ) {
    const title = lastUserText(messages.slice(0, 1)).trim().slice(0, 48);
    return createAssistantStream((controller) => {
      controller.appendText(title || "New chat");
    });
  }
}

const PROMPTS = [
  {
    title: "Check the weather",
    label: "with reasoning and a tool call",
    prompt: "What is the weather in Tokyo?",
  },
  {
    title: "Show an image",
    label: "in the reply",
    prompt: "Draw me a picture.",
  },
  {
    title: "Cause an error",
    label: "to see the error state",
    prompt: "Fail with an error.",
  },
];

const PROMPT_ICONS: Record<string, IconSvgElement> = {
  "What is the weather in Tokyo?": SunCloud01Icon,
  "Draw me a picture.": Image01Icon,
  "Fail with an error.": Alert02Icon,
};

/** After a reply, offers the prompts this chat has not used yet. */
const followUps: SuggestionAdapter = {
  async generate({ messages }) {
    const sent = new Set(
      messages
        .filter((message) => message.role === "user")
        .flatMap((message) =>
          message.content.map((part) =>
            part.type === "text" ? part.text : "",
          ),
        ),
    );
    return PROMPTS.filter((entry) => !sent.has(entry.prompt));
  },
};

const runtimeOptions: LocalRuntimeOptions = {
  unstable_enableMessageQueue: true,
  adapters: {
    attachments: new CompositeAttachmentAdapter([
      new SimpleImageAttachmentAdapter(),
      new SimpleTextAttachmentAdapter(),
    ]),
    feedback: { submit: () => {} },
    speech: new WebSpeechSynthesisAdapter(),
    suggestion: followUps,
  },
};

const config = AuiConfig({ suggestions: Suggestions(PROMPTS) });

function useScriptedRuntime() {
  const adapter = useMemo(() => new ScriptedThreadList(), []);
  return useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function RuntimeHook() {
      return useLocalRuntime(scriptedModel, runtimeOptions);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

function Icon({
  icon,
  className,
}: {
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.75}
      aria-hidden
      {...(className ? { className } : {})}
    />
  );
}

const focusRing =
  "outline-hidden focus-visible:ring-1 focus-visible:ring-foreground/20";

const iconButton = `text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-3.5 ${focusRing}`;

const iconSwap =
  "[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";
const iconSwapIn = "scale-100 opacity-100 blur-none";
const iconSwapOut = "scale-[0.25] opacity-0 blur-[4px]";

function Tip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

/* A filled area with no border. */
const field = "bg-foreground/4 dark:bg-foreground/6";

/* A suggestion chip: white with a light border and the composer's shadow. */
const chip = `bg-background border-border/60 hover:bg-accent flex h-8 items-center gap-1.5 rounded-full border px-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-colors motion-reduce:transition-none ${focusRing}`;

/*
 * A menu: a 16px glass popup with the float shadow, 13px text and 26px rows
 * (36px on touch) with 12px corners. Hover fills and muted text switch to
 * their glass colors, and the surface is solid where blur is unsupported or
 * reduced transparency is on.
 */
const menu =
  "text-popover-foreground border-border/60 z-50 flex min-w-40 origin-(--radix-dropdown-menu-content-transform-origin) flex-col rounded-(--radius) border bg-(--glass) p-1 text-[0.8125rem] leading-[1.125rem] font-[380] shadow-(--float-shadow) outline-none backdrop-blur-(--glass-blur) [--accent:var(--glass-hover)] [--muted-foreground:var(--glass-muted-foreground)] not-supports-[backdrop-filter:blur(1px)]:bg-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-96 data-[state=open]:duration-150 data-[state=open]:ease-[cubic-bezier(0.2,0.7,0.2,1)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-96 data-[state=closed]:duration-100 data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

const menuItem =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex h-6.5 shrink-0 items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";

const menuItemDestructive =
  "text-destructive data-highlighted:bg-destructive/5 data-highlighted:text-destructive";

const menuSeparator = "bg-border mx-2 my-1 h-px shrink-0";

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The sidebar opens and closes in one step, from the button, the shortcut or
 * a drag past its minimum width. This plays that step back as a 200ms slide.
 */
function useSnapAnimation() {
  const groupRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<Layout | null>(null);

  const onLayoutChange = useCallback((layout: Layout) => {
    const previous = layoutRef.current;
    layoutRef.current = layout;
    const group = groupRef.current;
    if (!previous || !group) return;

    const snapped = Object.keys(layout).some(
      (id) => (previous[id] ?? 0) > 0 !== (layout[id] ?? 0) > 0,
    );
    if (!snapped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const id of Object.keys(layout)) {
      const panel = group.querySelector<HTMLElement>(`:scope > [id="${id}"]`);
      const from = previous[id];
      const to = layout[id];
      if (!panel || from === undefined || to === undefined) continue;
      for (const animation of panel.getAnimations()) animation.cancel();
      panel.animate([{ flexGrow: from }, { flexGrow: to }], {
        duration: 200,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      });
    }
  }, []);

  return { elementRef: groupRef, onLayoutChange };
}

export function Chat() {
  const runtime = useScriptedRuntime();
  const [floating, setFloating] = useState(false);
  const isMobile = useIsMobile();
  const sidebarRef = usePanelRef();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const snap = useSnapAnimation();

  const toggleSidebar = useCallback(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    if (sidebar.isCollapsed()) sidebar.expand();
    else sidebar.collapse();
  }, [sidebarRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return;
      if (event.key?.toLowerCase() !== "b") return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <TooltipProvider delay={300}>
        <ResizablePanelGroup
          {...snap}
          className="bg-background text-foreground text-sm"
        >
          {/* A phone has no room for the sidebar; the header keeps New chat. */}
          {!isMobile && (
            <>
              <ResizablePanel
                id="sidebar"
                panelRef={sidebarRef}
                collapsible
                collapsedSize={0}
                defaultSize="15rem"
                minSize="12rem"
                maxSize="24rem"
                groupResizeBehavior="preserve-pixel-size"
                onResize={(size) => setSidebarOpen(size.inPixels > 0)}
                style={{ overflow: "hidden" }}
              >
                <aside
                  inert={!sidebarOpen}
                  className="h-full min-w-48 overflow-y-auto p-2"
                >
                  <SidebarBar onSidebarToggle={toggleSidebar} />
                  <ThreadList />
                </aside>
              </ResizablePanel>
              <ResizableHandle
                disabled={!sidebarOpen}
                // Hidden once the sidebar has finished sliding shut.
                className={
                  sidebarOpen
                    ? ""
                    : "pointer-events-none invisible transition-[visibility] delay-200 motion-reduce:delay-0"
                }
              />
            </>
          )}
          <ResizablePanel id="main" className="flex min-w-0 flex-col">
            <Header
              floating={floating}
              onFloatingChange={setFloating}
              onSidebarToggle={
                isMobile || sidebarOpen ? undefined : toggleSidebar
              }
            />
            {floating ? <FloatingChat /> : <Thread />}
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}

function Header({
  floating,
  onFloatingChange,
  onSidebarToggle,
}: {
  floating: boolean;
  onFloatingChange: (floating: boolean) => void;
  /** Set while the sidebar is hidden, when the header holds its button. */
  onSidebarToggle: (() => void) | undefined;
}) {
  const title = useAuiState((s) => s.threadListItem.title);
  const label = floating ? "Dock the chat" : "Float the chat";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      {onSidebarToggle && (
        <Tip label="Show the sidebar">
          <button
            type="button"
            onClick={onSidebarToggle}
            className={`${iconButton} -ms-1`}
          >
            <Icon icon={LayoutAlignLeftIcon} />
          </button>
        </Tip>
      )}
      <h1 className="min-w-0 flex-1 truncate font-medium">
        {title || "New chat"}
      </h1>
      <Tip label="New chat">
        <ThreadListPrimitive.New className={`${iconButton} md:hidden`}>
          <Icon icon={Add01Icon} />
        </ThreadListPrimitive.New>
      </Tip>
      <Tip label={label}>
        <button
          type="button"
          aria-pressed={floating}
          onClick={() => onFloatingChange(!floating)}
          className={iconButton}
        >
          {floating ? (
            <Icon icon={PictureInPictureExitIcon} />
          ) : (
            <Icon icon={PictureInPictureOnIcon} />
          )}
        </button>
      </Tip>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar bar: back and forward through the chats you opened                 */
/* -------------------------------------------------------------------------- */

/** The chats opened in this session, in order, like a browser's history. */
function useChatHistory() {
  const aui = useAui();
  const current = useAuiState((s) => s.threads.mainThreadId);
  const known = useAuiState((s) =>
    [
      ...s.threads.threadIds,
      ...s.threads.archivedThreadIds,
      s.threads.newThreadId ?? "",
    ].join("\n"),
  );
  const [history, setHistory] = useState(() => ({
    entries: [current],
    index: 0,
  }));
  const pending = useRef<number | null>(null);

  useEffect(() => {
    const target = pending.current;
    pending.current = null;
    setHistory((previous) => {
      if (target !== null && previous.entries[target] === current)
        return { ...previous, index: target };
      if (previous.entries[previous.index] === current) return previous;
      return {
        entries: [...previous.entries.slice(0, previous.index + 1), current],
        index: previous.index + 1,
      };
    });
  }, [current]);

  // A deleted chat stays in the list and is stepped over.
  const ids = known.split("\n");
  const find = (step: -1 | 1) => {
    for (
      let index = history.index + step;
      index >= 0 && index < history.entries.length;
      index += step
    ) {
      const id = history.entries[index];
      if (id !== undefined && id !== current && ids.includes(id)) return index;
    }
    return null;
  };
  const go = (step: -1 | 1) => {
    const index = find(step);
    const id = index === null ? undefined : history.entries[index];
    if (index === null || id === undefined) return;
    pending.current = index;
    aui.threads().switchToThread(id);
  };

  return {
    canGoBack: find(-1) !== null,
    canGoForward: find(1) !== null,
    goBack: () => go(-1),
    goForward: () => go(1),
  };
}

function SidebarBar({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const { canGoBack, canGoForward, goBack, goForward } = useChatHistory();

  return (
    <div className="mb-1 flex h-8 items-center gap-0.5">
      <Tip label="Back">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={goBack}
          className={iconButton}
        >
          <Icon icon={ArrowLeft02Icon} className="rtl:rotate-180" />
        </button>
      </Tip>
      <Tip label="Forward">
        <button
          type="button"
          disabled={!canGoForward}
          onClick={goForward}
          className={iconButton}
        >
          <Icon icon={ArrowRight02Icon} className="rtl:rotate-180" />
        </button>
      </Tip>
      <Tip label="Hide the sidebar">
        <button
          type="button"
          onClick={onSidebarToggle}
          className={`${iconButton} ms-auto`}
        >
          <Icon icon={SidebarLeftIcon} />
        </button>
      </Tip>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ThreadList, ThreadListItem, ThreadListItemMore                             */
/* -------------------------------------------------------------------------- */

function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-0.5">
      <span className="mb-1 flex h-8 w-fit items-center px-2 text-lg font-medium">
        Chats
      </span>
      <ThreadListPrimitive.New
        className={`hover:bg-accent data-active:bg-accent mb-1 flex h-8 items-center gap-2 rounded-lg px-2.5 font-medium transition-colors motion-reduce:transition-none ${focusRing}`}
      >
        <Icon icon={Add01Icon} className="size-4" />
        New chat
      </ThreadListPrimitive.New>
      <ThreadListPrimitive.Items>
        {() => <ThreadListItem />}
      </ThreadListPrimitive.Items>
      <AuiIf condition={(s: any) => s.threads.archivedThreadIds.length > 0}>
        <p className="text-muted-foreground mt-4 px-2.5 pb-1 text-xs">
          Archived
        </p>
        <ThreadListPrimitive.Items archived>
          {() => <ThreadListItem />}
        </ThreadListPrimitive.Items>
      </AuiIf>
    </ThreadListPrimitive.Root>
  );
}

function ThreadListItem() {
  const archived = useAuiState((s) => s.threadListItem.status === "archived");

  return (
    <ThreadListItemPrimitive.Root className="group hover:bg-accent data-active:bg-accent has-data-[state=open]:bg-accent relative flex h-8 items-center rounded-lg transition-colors motion-reduce:transition-none">
      <ThreadListItemPrimitive.Trigger
        className={`h-full min-w-0 flex-1 truncate rounded-lg ps-2.5 pe-9 text-start ${focusRing}`}
      >
        <ThreadListItemPrimitive.Title fallback="New chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMorePrimitive.Root>
        <Tip label="Chat options">
          <ThreadListItemMorePrimitive.Trigger
            className={`${iconButton} absolute end-1 size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100`}
          >
            <Icon icon={MoreHorizontalIcon} />
          </ThreadListItemMorePrimitive.Trigger>
        </Tip>
        <ThreadListItemMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className={menu}
        >
          {archived ? (
            <ThreadListItemPrimitive.Unarchive asChild>
              <ThreadListItemMorePrimitive.Item className={menuItem}>
                <Icon icon={Unarchive03Icon} />
                Restore
              </ThreadListItemMorePrimitive.Item>
            </ThreadListItemPrimitive.Unarchive>
          ) : (
            <ThreadListItemPrimitive.Archive asChild>
              <ThreadListItemMorePrimitive.Item className={menuItem}>
                <Icon icon={Archive02Icon} />
                Archive
              </ThreadListItemMorePrimitive.Item>
            </ThreadListItemPrimitive.Archive>
          )}
          <ThreadListItemMorePrimitive.Separator className={menuSeparator} />
          <ThreadListItemPrimitive.Delete asChild>
            <ThreadListItemMorePrimitive.Item
              className={`${menuItem} ${menuItemDestructive}`}
            >
              <Icon icon={Delete01Icon} />
              Delete
            </ThreadListItemMorePrimitive.Item>
          </ThreadListItemPrimitive.Delete>
        </ThreadListItemMorePrimitive.Content>
      </ThreadListItemMorePrimitive.Root>
    </ThreadListItemPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* AssistantModal: the same thread in a floating bubble                       */
/* -------------------------------------------------------------------------- */

function FloatingChat() {
  return (
    <div className="relative min-h-0 flex-1">
      <p className="text-muted-foreground p-6">
        The chat is in the bubble at the bottom corner.
      </p>
      <AssistantModalPrimitive.Root defaultOpen>
        <AssistantModalPrimitive.Anchor className="absolute end-4 bottom-4 size-11">
          <Tip label="Toggle the chat">
            <AssistantModalPrimitive.Trigger
              className={`bg-primary text-primary-foreground flex size-full items-center justify-center rounded-full transition-transform active:scale-95 motion-reduce:transition-none ${focusRing}`}
            >
              <Icon icon={BubbleChatIcon} className="size-5" />
            </AssistantModalPrimitive.Trigger>
          </Tip>
        </AssistantModalPrimitive.Anchor>
        <AssistantModalPrimitive.Content
          sideOffset={12}
          aria-label="Chat"
          className="bg-background z-50 flex h-[30rem] max-h-(--radix-popover-content-available-height) w-[24rem] max-w-[calc(100vw-2rem)] flex-col overflow-clip rounded-xl border shadow-lg outline-none"
        >
          <Thread />
        </AssistantModalPrimitive.Content>
      </AssistantModalPrimitive.Root>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Thread, Suggestion, SelectionToolbar                                       */
/* -------------------------------------------------------------------------- */

function Thread() {
  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pt-6">
          <AuiIf condition={(s: any) => s.thread.isEmpty}>
            <Welcome />
          </AuiIf>
          <div className="flex flex-col gap-6 pb-10 empty:hidden">
            <ThreadPrimitive.Messages>
              {() => <Message />}
            </ThreadPrimitive.Messages>
          </div>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col pb-4">
            <Tip label="Scroll to the newest message">
              <ThreadPrimitive.ScrollToBottom
                className={`${iconButton} bg-background absolute -top-10 self-center rounded-full border disabled:invisible`}
              >
                <Icon icon={ArrowDown02Icon} />
              </ThreadPrimitive.ScrollToBottom>
            </Tip>
            <FollowUps />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>

      <SelectionToolbarPrimitive.Root className="bg-popover text-popover-foreground z-50 rounded-lg border p-1 shadow-md">
        <SelectionToolbarPrimitive.Quote
          className={`hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1 text-sm ${focusRing}`}
        >
          <Icon icon={QuoteDownIcon} className="size-3.5" />
          Quote
        </SelectionToolbarPrimitive.Quote>
      </SelectionToolbarPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

/* Suggestions that follow a reply, as chips right above the composer. */
function FollowUps() {
  const suggestions = useAuiState((s) => s.thread.suggestions);
  const visible = useAuiState(
    (s) =>
      !s.thread.isEmpty &&
      !s.thread.isRunning &&
      s.thread.suggestions.length > 0,
  );
  if (!visible) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pb-2">
      {suggestions.map((suggestion) => {
        const icon = PROMPT_ICONS[suggestion.prompt];
        return (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            className={chip}
          >
            {icon && <Icon icon={icon} className="size-3.5" />}
            {suggestion.title ?? suggestion.prompt}
          </ThreadPrimitive.Suggestion>
        );
      })}
    </div>
  );
}

/** The icon for the suggestion being rendered, matched by its prompt. */
function SuggestionIcon({ className }: { className?: string }) {
  const prompt = useAuiState((s) => s.suggestion.prompt);
  const icon = PROMPT_ICONS[prompt];
  return icon ? (
    <Icon icon={icon} {...(className ? { className } : {})} />
  ) : null;
}

function Welcome() {
  return (
    <div className="my-auto flex flex-col items-center gap-6 pb-6">
      <p className="text-center text-2xl font-medium tracking-tight">
        What should we try first?
      </p>
      <div className="flex w-full max-w-sm flex-col gap-0.5">
        <ThreadPrimitive.Suggestions>
          {() => (
            <SuggestionPrimitive.Trigger
              send
              className={`hover:bg-accent flex h-11 items-center gap-3 rounded-xl px-2 text-start transition-colors motion-reduce:transition-none ${focusRing}`}
            >
              <span
                className={`${field} flex size-7 shrink-0 items-center justify-center rounded-full`}
              >
                <SuggestionIcon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                <SuggestionPrimitive.Title />{" "}
                <SuggestionPrimitive.Description className="text-muted-foreground" />
              </span>
            </SuggestionPrimitive.Trigger>
          )}
        </ThreadPrimitive.Suggestions>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer, Attachment, QueueItem                                            */
/* -------------------------------------------------------------------------- */

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex flex-col">
      <ComposerPrimitive.AttachmentDropzone className="bg-background data-[dragging=true]:border-ring border-border/60 flex flex-col gap-2 rounded-3xl border p-2 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-colors data-[dragging=true]:border-dashed motion-reduce:transition-none">
        <ComposerPrimitive.Queue>
          {() => (
            <div className="bg-background flex items-center gap-1 rounded-lg border py-1 ps-2.5 pe-1">
              <QueueItemPrimitive.Text className="min-w-0 flex-1 truncate" />
              <QueueItemPrimitive.Steer
                className={`hover:bg-accent text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-xs ${focusRing}`}
              >
                Send now
              </QueueItemPrimitive.Steer>
              <Tip label="Remove from the queue">
                <QueueItemPrimitive.Remove className={iconButton}>
                  <Icon icon={Cancel01Icon} />
                </QueueItemPrimitive.Remove>
              </Tip>
            </div>
          )}
        </ComposerPrimitive.Queue>

        <ComposerPrimitive.Quote className="bg-background flex items-start gap-2 rounded-lg border py-1.5 ps-2.5 pe-1">
          <Icon
            icon={QuoteDownIcon}
            className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
          />
          <ComposerPrimitive.QuoteText className="text-muted-foreground line-clamp-2 min-w-0 flex-1" />
          <Tip label="Remove the quote">
            <ComposerPrimitive.QuoteDismiss className={iconButton}>
              <Icon icon={Cancel01Icon} />
            </ComposerPrimitive.QuoteDismiss>
          </Tip>
        </ComposerPrimitive.Quote>

        <div className="flex flex-wrap gap-2 empty:hidden">
          <ComposerPrimitive.Attachments>
            {() => <Attachment removable />}
          </ComposerPrimitive.Attachments>
        </div>

        <ComposerPrimitive.Input
          rows={1}
          placeholder="Send a message"
          aria-label="Message"
          className="placeholder:text-muted-foreground/50 max-h-40 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none"
        />

        <div className="flex items-center justify-between">
          <Tip label="Add a file">
            <ComposerPrimitive.AddAttachment className={iconButton}>
              <Icon icon={Attachment01Icon} />
            </ComposerPrimitive.AddAttachment>
          </Tip>
          <div className="flex items-center gap-1.5">
            <AuiIf condition={(s: any) => s.thread.isRunning}>
              <Tip label="Stop the reply">
                <ComposerPrimitive.Cancel className={`${iconButton} border`}>
                  <Icon icon={StopIcon} className="size-3! fill-current" />
                </ComposerPrimitive.Cancel>
              </Tip>
            </AuiIf>
            <Tip label="Send the message">
              <ComposerPrimitive.Send
                className={`bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-30 motion-reduce:transition-none ${focusRing}`}
              >
                <Icon icon={ArrowUp02Icon} className="size-4" />
              </ComposerPrimitive.Send>
            </Tip>
          </div>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function Attachment({ removable = false }: { removable?: boolean }) {
  return (
    <AttachmentPrimitive.Root className="bg-background flex h-9 max-w-52 items-center gap-2 rounded-lg border ps-1 pe-2">
      <AttachmentPrimitive.unstable_Thumb className="bg-muted text-muted-foreground flex h-7 min-w-7 items-center justify-center rounded-md px-1 font-mono text-[10px]" />
      <span className="min-w-0 flex-1 truncate">
        <AttachmentPrimitive.Name />
      </span>
      {removable && (
        <Tip label="Remove the file">
          <AttachmentPrimitive.Remove
            className={`${iconButton} -me-1.5 size-6`}
          >
            <Icon icon={Cancel01Icon} />
          </AttachmentPrimitive.Remove>
        </Tip>
      )}
    </AttachmentPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message, MessagePart, ChainOfThought, Error                                */
/* -------------------------------------------------------------------------- */

function Message() {
  const role = useAuiState((s) => s.message.role);
  const editing = useAuiState((s) => s.message.composer.isEditing);

  if (editing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="group flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <Attachment />}
        </MessagePrimitive.Attachments>
      </div>
      <MessagePrimitive.Quote>
        {({ text }: { text: string }) => (
          <blockquote className="text-muted-foreground line-clamp-3 max-w-[80%] border-s-2 ps-3">
            {text}
          </blockquote>
        )}
      </MessagePrimitive.Quote>
      <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2 wrap-break-word whitespace-pre-wrap">
        <MessagePrimitive.Parts />
      </div>
      <div className="flex min-h-7 items-center">
        <BranchPicker />
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="flex gap-0.5 group-focus-within:opacity-100 group-hover:opacity-100 data-floating:opacity-0"
        >
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
}

function EditComposer() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <ComposerPrimitive.Root
        className={`${field} flex w-full max-w-[80%] flex-col gap-2 rounded-2xl p-2`}
      >
        <ComposerPrimitive.Input
          autoFocus
          aria-label="Edit the message"
          className="min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none"
        />
        <div className="flex justify-end gap-1.5">
          <ComposerPrimitive.Cancel
            className={`hover:bg-accent h-8 rounded-lg px-3 ${focusRing}`}
          >
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            className={`bg-primary text-primary-foreground h-8 rounded-lg px-3 disabled:opacity-40 ${focusRing}`}
          >
            Send
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 leading-relaxed wrap-break-word">
        <MessagePrimitive.Parts
          components={{
            Text: TextPart,
            Image: ImagePart,
            Empty: WorkingDot,
            ChainOfThought,
          }}
        />
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="border-destructive/20 text-destructive bg-destructive/5 flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 font-normal">
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <div className="-ms-1.5 flex min-h-7 items-center">
        <BranchPicker />
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="flex gap-0.5 group-focus-within:opacity-100 group-hover:opacity-100 data-floating:opacity-0"
        >
          <CopyButton />
          <AuiIf condition={(s: any) => s.message.speech == null}>
            <Tip label="Read aloud">
              <ActionBarPrimitive.Speak className={iconButton}>
                <Icon icon={VolumeHighIcon} />
              </ActionBarPrimitive.Speak>
            </Tip>
          </AuiIf>
          <AuiIf condition={(s: any) => s.message.speech != null}>
            <Tip label="Stop reading">
              <ActionBarPrimitive.StopSpeaking className={iconButton}>
                <Icon icon={VolumeMute02Icon} />
              </ActionBarPrimitive.StopSpeaking>
            </Tip>
          </AuiIf>
          <Tip label="Good reply">
            <ActionBarPrimitive.FeedbackPositive
              className={`${iconButton} data-submitted:bg-foreground/[0.06] data-submitted:text-foreground/90 dark:data-submitted:bg-foreground/[0.09]`}
            >
              <Icon icon={ThumbsUpIcon} />
            </ActionBarPrimitive.FeedbackPositive>
          </Tip>
          <Tip label="Bad reply">
            <ActionBarPrimitive.FeedbackNegative
              className={`${iconButton} data-submitted:bg-foreground/[0.06] data-submitted:text-foreground/90 dark:data-submitted:bg-foreground/[0.09]`}
            >
              <Icon icon={ThumbsDownIcon} />
            </ActionBarPrimitive.FeedbackNegative>
          </Tip>
          <Tip label="Regenerate">
            <ActionBarPrimitive.Reload className={iconButton}>
              <Icon icon={RefreshIcon} />
            </ActionBarPrimitive.Reload>
          </Tip>
          <ActionBarMorePrimitive.Root>
            <Tip label="More">
              <ActionBarMorePrimitive.Trigger
                className={`${iconButton} data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground/90`}
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
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function TextPart() {
  return (
    <p className="whitespace-pre-wrap">
      <MessagePartPrimitive.Text />
      <MessagePartPrimitive.InProgress>
        <span
          aria-hidden
          className="ms-1 animate-pulse motion-reduce:animate-none"
        >
          ●
        </span>
      </MessagePartPrimitive.InProgress>
    </p>
  );
}

function ImagePart() {
  return (
    <MessagePartPrimitive.Image
      alt="A sun over two hills"
      className="w-64 max-w-full rounded-lg border"
    />
  );
}

function WorkingDot() {
  const running = useAuiState((s) => s.message.status?.type === "running");
  if (!running) return null;

  return (
    <span
      role="status"
      aria-label="Writing a reply"
      className="animate-pulse motion-reduce:animate-none"
    >
      ●
    </span>
  );
}

function ChainOfThought() {
  return (
    <ChainOfThoughtPrimitive.Root className="rounded-lg border">
      <ChainOfThoughtPrimitive.AccordionTrigger
        className={`text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 rounded-lg px-3 py-2 transition-colors motion-reduce:transition-none ${focusRing}`}
      >
        <AuiIf condition={(s: any) => s.chainOfThought.collapsed}>
          <Icon icon={ArrowRight01Icon} className="size-4 rtl:rotate-180" />
        </AuiIf>
        <AuiIf condition={(s: any) => !s.chainOfThought.collapsed}>
          <Icon icon={ArrowDown01Icon} className="size-4" />
        </AuiIf>
        Thinking
      </ChainOfThoughtPrimitive.AccordionTrigger>
      <AuiIf condition={(s: any) => !s.chainOfThought.collapsed}>
        <div className="flex flex-col gap-2 px-3 pb-3">
          <ChainOfThoughtPrimitive.Parts
            components={{
              Reasoning: ReasoningPart,
              tools: { Fallback: ToolCallPart },
              Layout: PartLayout,
            }}
          />
        </div>
      </AuiIf>
    </ChainOfThoughtPrimitive.Root>
  );
}

function PartLayout({ children }: PropsWithChildren) {
  return <div>{children}</div>;
}

function ReasoningPart({ text }: { text: string }) {
  return <p className="text-muted-foreground whitespace-pre-wrap">{text}</p>;
}

function ToolCallPart({
  toolName,
  argsText,
  result,
}: ToolCallMessagePartProps) {
  return (
    <div className="bg-muted/40 rounded-md border px-2.5 py-2 font-mono text-xs">
      <p className="flex items-center gap-1.5">
        <Icon icon={Wrench01Icon} className="text-muted-foreground size-3.5" />
        {toolName}
        <span className="text-muted-foreground">{argsText}</span>
      </p>
      <p className="text-muted-foreground mt-1" role="status">
        {result === undefined ? "Running" : JSON.stringify(result)}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ActionBar pieces and BranchPicker                                          */
/* -------------------------------------------------------------------------- */

function CopyButton() {
  const copied = useAuiState((s) => s.message.isCopied);

  return (
    <Tip label={copied ? "Copied" : "Copy"}>
      <ActionBarPrimitive.Copy
        className={`${iconButton} grid place-items-center ${copied ? "text-emerald-500" : ""}`}
      >
        <Icon
          icon={Copy01Icon}
          className={`${iconSwap} ${copied ? iconSwapOut : iconSwapIn}`}
        />
        <Icon
          icon={Tick02Icon}
          className={`${iconSwap} ${copied ? iconSwapIn : iconSwapOut}`}
        />
      </ActionBarPrimitive.Copy>
    </Tip>
  );
}

function BranchPicker() {
  return (
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
}
