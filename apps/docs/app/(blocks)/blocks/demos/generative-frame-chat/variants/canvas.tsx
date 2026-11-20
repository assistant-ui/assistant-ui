"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { SidebarRightIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { EyeIcon, PanelRightIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import {
  Group,
  Panel,
  Separator,
  useGroupRef,
  type Layout,
  type LayoutChangedMeta,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";
import {
  ChatList,
  chipClass,
  Composer,
  CopyButton,
  field,
  floating,
  focusComposer,
  glyphFor,
  hairline,
  Icon,
  IconButton,
  icons,
  listRowClass,
  LiveDot,
  MarkdownText,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
  paper,
  Popover,
  PopoverContent,
  PopoverTrigger,
  radius,
  text,
  variantRoot,
  weight,
  type Glyph,
} from "../components/ui";
import {
  ASSISTANT,
  isStoppedEdit,
  isWidgetPart,
  lower,
  SUGGESTIONS,
  useFollowUps,
  useNewChat,
  useOpenChanges,
  useSendPrompt,
  useWidgetCall,
  useWidgetCalls,
  useWidgetCode,
  useWidgets,
  WELCOME,
  WidgetChip,
  WidgetCode,
  WidgetOutlet,
  WidgetStatusLine,
  widgetStatusText,
  type WidgetEntry,
} from "../lib/widgets";

const CHAT = "gfc-canvas-chat";
const PANE = "gfc-canvas-pane";

/** Under this width of the block the canvas is a sheet over the chat. */
const WIDE = 768;

const clip = { overflow: "hidden" } as const;

const canvasGlyph: Glyph = { huge: SidebarRightIcon, lucide: PanelRightIcon };
const previewGlyph: Glyph = { huge: ViewIcon, lucide: EyeIcon };

const segmented = `${hairline} flex shrink-0 items-center gap-px rounded-full border p-px`;

type CanvasState = {
  widgets: readonly WidgetEntry[];
  /** The widget the canvas holds, open or not. */
  entry: WidgetEntry | undefined;
  open: boolean;
  show: (title: string, from: HTMLElement) => void;
  hide: () => void;
};

const CanvasContext = createContext<CanvasState | null>(null);

function useCanvas() {
  const canvas = useContext(CanvasContext);
  if (!canvas) throw new Error("The canvas layout is not mounted.");
  return canvas;
}

/**
 * Chat and canvas: the conversation in one pane and the widgets on a surface
 * of their own beside it, with a divider to drag. A widget call in the thread
 * is a chip that puts its widget on the canvas. Where the block is narrower
 * than 768px the canvas is a sheet over the chat.
 */
export function CanvasVariant() {
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const afterClose = useRef<(() => void) | null>(null);
  const settled = useRef<Layout | null>(null);
  const group = useGroupRef();
  const { element: groupElement, play } = useSlide();
  const wide = useWide(root);
  const widgets = useWidgets();
  const calls = useWidgetCalls();
  const [picked, setPicked] = useState("");
  const [open, setOpen] = useState<boolean | null>(null);
  const [asked, setAsked] = useState(0);
  const [paneReady, setPaneReady] = useState(false);
  const [followed, setFollowed] = useState("");

  const live = calls.findLast(
    (call) =>
      call.status === "streaming" &&
      (call.title !== "" || call.toolName === "show_widget"),
  );
  const following = live ? `${live.toolCallId} ${live.title}` : "";
  if (followed !== following) {
    setFollowed(following);
    if (live) {
      setPicked(live.title);
      setOpen(true);
    }
  }

  const entry = widgets.find((item) => item.title === picked) ?? widgets.at(-1);
  const shown = (open ?? wide === true) && entry !== undefined;
  const sheet = wide === false && shown;
  const drawn = entry?.call.toolCallId;

  const show = useCallback((title: string, from: HTMLElement) => {
    opener.current = from;
    afterClose.current = null;
    setPicked(title);
    setOpen(true);
    setAsked((count) => count + 1);
  }, []);

  const hide = useCallback(() => {
    afterClose.current = null;
    setOpen(false);
  }, []);

  const dismiss = useCallback(() => {
    const from = opener.current?.isConnected
      ? opener.current
      : root.current?.querySelector<HTMLElement>(
          `[data-widget-call="${drawn}"] button`,
        );
    opener.current = null;
    afterClose.current = from
      ? () => from.focus({ preventScroll: true })
      : focusComposer;
    setOpen(false);
  }, [drawn]);

  const onDraft = useCallback(() => {
    opener.current = null;
    afterClose.current = focusComposer;
    setOpen(false);
  }, []);

  // The chat is inert under the sheet, so focus moves once it is not.
  useEffect(() => {
    if (shown) return;
    afterClose.current?.();
    afterClose.current = null;
  }, [shown]);

  useEffect(() => {
    if (sheet) back.current?.focus();
  }, [sheet]);

  const onLayoutChange = useCallback(
    (layout: Layout) => {
      play(layout);
      setPaneReady(PANE in layout);
    },
    [play],
  );

  const onLayoutChanged = useCallback(
    (layout: Layout, meta: LayoutChangedMeta) => {
      const size = layout[PANE];
      if (size === undefined) return;
      if (size > 0) {
        settled.current = layout;
        return;
      }
      if (!meta.isUserInteraction) return;
      const held = document.activeElement;
      if (!held || held === document.body || held.closest("[data-gfc-chat]"))
        hide();
      else dismiss();
    },
    [dismiss, hide],
  );

  // The pane stays mounted at no width while it is closed, so its frames live on.
  useEffect(() => {
    const api = group.current;
    const element = groupElement.current;
    if (!paneReady || !api || !element) return;
    const size = api.getLayout()[PANE];
    if (size === undefined || shown === size > 0) return;
    if (!shown) {
      api.setLayout({ [CHAT]: 100, [PANE]: 0 });
      return;
    }
    const width = element.offsetWidth;
    if (width === 0) return;
    const chat = (Math.max(320, Math.min(380, width - 401)) / width) * 100;
    api.setLayout(settled.current ?? { [CHAT]: chat, [PANE]: 100 - chat });
  }, [asked, group, groupElement, paneReady, shown]);

  const value = useMemo(
    () => ({ widgets, entry, open: shown, show, hide }),
    [widgets, entry, shown, show, hide],
  );

  const onCanvasKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    // A menu opened from the canvas renders in the body and closes itself.
    if (
      !(event.target instanceof Node) ||
      !event.currentTarget.contains(event.target)
    )
      return;
    dismiss();
  };

  const canvas = entry && (
    <Canvas
      entry={entry}
      widgets={widgets}
      compact={wide === false}
      back={back}
      onPick={setPicked}
      onClose={dismiss}
    />
  );

  return (
    <CanvasContext.Provider value={value}>
      <ThreadPrimitive.Root
        ref={root}
        data-variant="canvas"
        className={variantRoot}
      >
        <Group
          elementRef={groupElement}
          groupRef={group}
          onLayoutChange={onLayoutChange}
          onLayoutChanged={onLayoutChanged}
          inert={sheet}
          className="absolute inset-0"
        >
          <Panel
            id={CHAT}
            data-gfc-chat
            minSize={320}
            style={clip}
            className="relative flex min-w-0 flex-col"
          >
            <ChatPane />
          </Panel>
          {wide && (
            <>
              <Separator
                aria-label="Resize the chat and the canvas"
                disabled={!shown}
                disableDoubleClick
                className={cn(
                  "bg-border/60 focus-visible:after:bg-ring data-[separator=active]:after:bg-ring data-[separator=hover]:after:bg-ring relative z-10 w-px outline-none after:absolute after:inset-y-0 after:-start-px after:w-[3px] after:transition-colors motion-reduce:after:transition-none",
                  !shown &&
                    "pointer-events-none invisible transition-[visibility] delay-200 motion-reduce:delay-0",
                )}
              />
              <Panel
                id={PANE}
                collapsible
                collapsedSize={0}
                defaultSize={0}
                minSize={400}
                style={clip}
                className="flex"
              >
                {canvas && (
                  <section
                    aria-label="Canvas"
                    inert={!shown}
                    onKeyDown={onCanvasKey}
                    className="flex min-w-100 flex-1 flex-col"
                  >
                    {canvas}
                  </section>
                )}
              </Panel>
            </>
          )}
        </Group>
        {wide === false && canvas && (
          <div
            role="dialog"
            aria-label="Canvas"
            inert={!shown}
            onKeyDown={onCanvasKey}
            className={cn(
              "bg-background absolute inset-0 z-30 flex flex-col duration-200 ease-out motion-reduce:transition-none",
              // Visibility is left out on the way in, so the sheet takes the focus at once.
              shown
                ? "transition-[opacity,translate] starting:translate-y-2 starting:opacity-0"
                : "pointer-events-none invisible translate-y-2 opacity-0 transition-[opacity,translate,visibility]",
            )}
          >
            {canvas}
            {shown && <DraftWatch onDraft={onDraft} />}
          </div>
        )}
      </ThreadPrimitive.Root>
    </CanvasContext.Provider>
  );
}

/** Whether the block is wide enough for two panes; null until it is measured. */
function useWide(root: RefObject<HTMLElement | null>) {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([size]) => {
      if (size) setWide(size.contentRect.width >= WIDE);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [root]);
  return wide;
}

/**
 * The canvas opens and closes in one step of the layout. This plays that step
 * back as a 200ms slide of both panes.
 */
function useSlide() {
  const element = useRef<HTMLDivElement>(null);
  const last = useRef<Layout | null>(null);

  const play = useCallback((layout: Layout) => {
    const previous = last.current;
    last.current = layout;
    const group = element.current;
    if (!previous || !group) return;

    const ids = Object.keys(layout);
    const snapped = ids.some(
      (id) => (previous[id] ?? 0) > 0 !== (layout[id] ?? 0) > 0,
    );
    if (!snapped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const id of ids) {
      const panel = group.querySelector<HTMLElement>(`:scope > [id="${id}"]`);
      const to = layout[id];
      if (!panel || to === undefined) continue;
      for (const animation of panel.getAnimations()) animation.cancel();
      panel.animate([{ flexGrow: previous[id] ?? 0 }, { flexGrow: to }], {
        duration: 200,
        easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      });
    }
  }, []);

  return { element, play };
}

/**
 * The sheet covers the composer. A widget that writes a prompt there closes
 * the sheet, so the prompt can be read and sent.
 */
function DraftWatch({ onDraft }: { onDraft: () => void }) {
  const draft = useAuiState((s) => s.thread.composer.text);
  const seen = useRef(draft);
  useEffect(() => {
    if (draft === seen.current) return;
    seen.current = draft;
    if (draft.trim()) onDraft();
  }, [draft, onDraft]);
  return null;
}

/* -------------------------------------------------------------------------- */
/* The chat pane.                                                             */
/* -------------------------------------------------------------------------- */

function ChatPane() {
  return (
    <>
      <div
        aria-hidden
        className="from-background via-background/80 pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-linear-to-b to-transparent"
      />
      <TopBar />
      <ThreadPrimitive.Viewport className="gfc-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pt-16">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <Welcome />
          </AuiIf>
          <div className="flex flex-col gap-6 pb-8 empty:hidden">
            <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
            <FollowUps />
          </div>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col gap-2 pb-3">
            <div
              aria-hidden
              className="from-background pointer-events-none absolute inset-x-0 -top-6 h-6 bg-linear-to-t to-transparent"
            />
            <ThreadPrimitive.ScrollToBottom asChild>
              <IconButton
                label="Scroll to the newest message"
                icon={icons.arrowDown}
                side="top"
                className={cn(
                  paper,
                  "hover:bg-accent absolute -top-10 self-center shadow-(--float-shadow) disabled:invisible",
                )}
              />
            </ThreadPrimitive.ScrollToBottom>
            <Composer />
            <p className={cn("text-muted-foreground text-center", text.small)}>
              {WELCOME.note}
            </p>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </>
  );
}

/** The chats of this visit, a new one, and the canvas once the chat has a widget. */
function TopBar() {
  const [chats, setChats] = useState(false);
  const newChat = useNewChat();
  const canvas = useCanvas();
  const { entry } = canvas;

  return (
    <div
      className={cn(
        floating,
        "absolute start-3 top-3 z-20 flex h-9 items-center gap-0.5 rounded-full p-px pointer-coarse:h-10",
      )}
    >
      <Popover open={chats} onOpenChange={setChats}>
        <PopoverTrigger
          render={
            <IconButton label="Chats" icon={icons.history} className="size-8" />
          }
        />
        <PopoverContent aria-label="Chats">
          <ChatList
            onPick={() => setChats(false)}
            className="gfc-scroll max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain p-1"
          />
        </PopoverContent>
      </Popover>
      <IconButton
        label="New chat"
        icon={icons.newChat}
        className="size-8"
        onClick={newChat}
      />
      {entry && (
        <IconButton
          label={canvas.open ? "Hide the canvas" : "Show the canvas"}
          icon={canvasGlyph}
          aria-expanded={canvas.open}
          className="aria-expanded:bg-accent aria-expanded:text-foreground size-8"
          onClick={(event) =>
            canvas.open
              ? canvas.hide()
              : canvas.show(entry.title, event.currentTarget)
          }
        />
      )}
    </div>
  );
}

function Welcome() {
  return (
    <div className="my-auto flex flex-col items-center gap-6 pb-8">
      <h1 className={cn("text-center font-sans", text.title, weight.heading)}>
        {WELCOME.title}
      </h1>
      <div className="flex w-full max-w-sm flex-col gap-0.5">
        {SUGGESTIONS.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            onClick={focusComposer}
            className={cn(listRowClass, "h-9 gap-2.5 pointer-coarse:h-11")}
          >
            <span
              className={cn(
                field,
                "flex size-6 shrink-0 items-center justify-center rounded-full",
              )}
            >
              <Icon {...glyphFor(suggestion.icon)} className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

function FollowUps() {
  const followUps = useFollowUps();
  if (followUps.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Suggested next steps"
      className="flex flex-wrap gap-1.5"
    >
      {followUps.map((prompt) => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          send
          onClick={focusComposer}
          className={chipClass}
        >
          <span className="min-w-0 truncate">{prompt}</span>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

const renderMessage = () => <Message />;

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div
        className={cn(
          field,
          radius.xl,
          "max-w-[85%] px-3.5 py-2 text-[0.9375rem] leading-6 wrap-break-word whitespace-pre-wrap",
        )}
      >
        <MessagePrimitive.Parts>
          {({ part }) => (part.type === "text" ? part.text : null)}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const copied = useAuiState((s) => s.message.isCopied);

  return (
    <MessagePrimitive.Root className="group flex min-w-0 flex-col gap-2">
      <span className="sr-only">{ASSISTANT.name}</span>
      <AuiIf
        condition={(s) =>
          s.message.status?.type === "running" && s.message.content.length === 0
        }
      >
        <p role="status" className={cn("text-muted-foreground", text.bodySm)}>
          <span className="shimmer motion-reduce:animate-none">Thinking</span>
        </p>
      </AuiIf>
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text") return part.text ? <MarkdownText /> : <></>;
          if (isWidgetPart(part))
            return <ThreadWidget toolCallId={part.toolCallId} />;
          return <></>;
        }}
      </MessagePrimitive.Parts>
      <ActionBarPrimitive.Root
        hideWhenRunning
        className="-ms-1.5 flex h-7 gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
      >
        <ActionBarPrimitive.Copy asChild>
          <IconButton
            label={copied ? "Copied" : "Copy the reply"}
            icon={copied ? icons.tick : icons.copy}
          />
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

/**
 * A widget call in its message: a chip that puts the widget on the canvas.
 * The chip of the call the canvas draws is pressed while the canvas shows it;
 * the chip of a replaced or failed call leads to the widget as it is now; an
 * edit that was stopped is one line.
 */
function ThreadWidget({ toolCallId }: { toolCallId: string }) {
  const call = useWidgetCall(toolCallId);
  const canvas = useCanvas();
  if (!call) return null;
  if (isStoppedEdit(call)) return <WidgetStatusLine toolCallId={toolCallId} />;

  const entry = canvas.widgets.find((item) =>
    item.calls.some((other) => other.toolCallId === toolCallId),
  );
  if (!entry) return <WidgetChip toolCallId={toolCallId} />;

  const drawn = entry.call.toolCallId === toolCallId;
  const select = (event: MouseEvent<HTMLButtonElement>) =>
    canvas.show(entry.title, event.currentTarget);

  return (
    <div data-widget-call={toolCallId} className="flex min-w-0">
      {drawn || call.status === "streaming" ? (
        <WidgetChip
          toolCallId={toolCallId}
          onOpen={select}
          active={canvas.open && drawn && canvas.entry === entry}
        />
      ) : (
        <WidgetChip
          toolCallId={toolCallId}
          onOpen={select}
          label={`${call.label}, ${lower(widgetStatusText(call))}. Show the widget as it is now`}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The canvas.                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The header and the surface of the canvas. Every widget of the chat keeps
 * its frame mounted here and only the picked one shows, so a switch or the
 * code view does not reload a frame or hold up the reply that waits for it.
 */
function Canvas({
  entry,
  widgets,
  compact,
  back,
  onPick,
  onClose,
}: {
  entry: WidgetEntry;
  widgets: readonly WidgetEntry[];
  /** A sheet over the chat, with a way back, in place of a pane beside it. */
  compact: boolean;
  back: RefObject<HTMLButtonElement | null>;
  onPick: (title: string) => void;
  onClose: () => void;
}) {
  const running = useAuiState((s) => s.thread.isRunning);
  const changes = useOpenChanges(entry.title);
  const code = useWidgetCode(entry.call.toolCallId);
  const send = useSendPrompt();
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const sent = useRef(false);

  const busy = entry.calls.findLast((call) => call.status === "streaming");
  const status = busy ?? entry.call;
  const ready = entry.call.status === "ready";
  const canView = ready || busy !== undefined;
  const showCode = canView && codeFor === entry.title;
  const many = widgets.length > 1;

  const ask = (prompt: string) => {
    sent.current = true;
    send(prompt);
    if (!compact) focusComposer();
  };

  return (
    <>
      <header className={cn(hairline, "@container shrink-0 border-b")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2">
          <div className="order-1 flex min-h-8 min-w-0 flex-1 items-center gap-2">
            {compact && (
              <IconButton
                ref={back}
                label="Back to the chat"
                icon={icons.chevronLeft}
                className="-ms-1"
                onClick={onClose}
              />
            )}
            <Icon {...glyphFor(entry.icon)} className="text-muted-foreground" />
            <h2 className={cn("min-w-0 truncate", weight.strong)}>
              {entry.label}
            </h2>
            <span
              className={cn(
                "text-muted-foreground flex shrink-0 items-center gap-1.5",
                text.bodySm,
              )}
            >
              {busy && <LiveDot />}
              {widgetStatusText(status)}
            </span>
          </div>
          {(many || canView || changes.length > 0) && (
            <div className="order-3 flex min-w-0 basis-full items-center gap-1.5 @xl:order-2 @xl:basis-auto">
              {many && (
                <div
                  role="group"
                  aria-label="Widgets in this chat"
                  className={cn(
                    segmented,
                    "max-w-full shrink [scrollbar-width:none] overflow-x-auto",
                  )}
                >
                  {widgets.map((item) => (
                    <IconButton
                      key={item.id}
                      label={item.label}
                      icon={glyphFor(item.icon)}
                      active={item === entry}
                      onClick={() => onPick(item.title)}
                    />
                  ))}
                </div>
              )}
              <span className="min-w-0 flex-1" />
              {changes.length > 0 && (
                <Menu>
                  <MenuTrigger
                    disabled={running}
                    render={
                      <IconButton label="Ask for a change" icon={icons.edit} />
                    }
                  />
                  <MenuContent
                    align="end"
                    finalFocus={() => {
                      if (!sent.current) return true;
                      sent.current = false;
                      return compact ? back.current : false;
                    }}
                  >
                    <MenuLabel>Ask for a change</MenuLabel>
                    {changes.map((prompt) => (
                      <MenuItem key={prompt} onClick={() => ask(prompt)}>
                        {prompt}
                      </MenuItem>
                    ))}
                  </MenuContent>
                </Menu>
              )}
              {canView && (
                <div role="group" aria-label="View" className={segmented}>
                  <IconButton
                    label="Preview"
                    icon={previewGlyph}
                    active={!showCode}
                    disabled={!ready}
                    onClick={() => setCodeFor(null)}
                  />
                  <IconButton
                    label="Code"
                    icon={icons.code}
                    active={showCode}
                    disabled={!ready}
                    onClick={() => setCodeFor(entry.title)}
                  />
                </div>
              )}
            </div>
          )}
          {!compact && (
            <IconButton
              label="Close the canvas"
              icon={icons.close}
              className="order-2 @xl:order-3"
              onClick={onClose}
            />
          )}
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            "gfc-scroll absolute inset-0 overflow-y-auto p-4",
            showCode && "invisible",
          )}
        >
          <div className="mx-auto w-full max-w-[45rem]">
            {widgets.map((item) => (
              <div
                key={item.id}
                role="group"
                aria-label={item.label}
                className={cn(
                  !compact && [paper, radius.lg, "p-4"],
                  item !== entry &&
                    "invisible h-0 overflow-hidden border-y-0 py-0",
                )}
              >
                <WidgetOutlet
                  key={item.call.toolCallId}
                  toolCallId={item.call.toolCallId}
                />
              </div>
            ))}
            <WidgetStatusLine toolCallId={status.toolCallId} className="mt-3" />
          </div>
        </div>
        {showCode && (
          <div className="absolute inset-0 flex p-4">
            <div
              className={cn(
                field,
                radius.lg,
                "relative mx-auto flex min-h-0 w-full max-w-[45rem] flex-col",
              )}
            >
              <WidgetCode
                id={entry.call.toolCallId}
                className={cn(radius.lg, "min-h-0 flex-1 p-4 pe-12")}
              />
              <CopyButton
                text={code ?? ""}
                label="Copy the code"
                side="left"
                className="absolute end-2 top-2"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
