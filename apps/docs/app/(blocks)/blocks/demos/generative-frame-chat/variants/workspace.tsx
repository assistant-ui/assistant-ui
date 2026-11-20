"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  MessagePrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import {
  ChatRow,
  chipClass,
  Composer,
  CopyButton,
  denseGlass,
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
  radius,
  text,
  variantRoot,
  weight,
} from "../components/ui";
import {
  ASSISTANT,
  isStoppedEdit,
  isWidgetPart,
  SUGGESTIONS,
  useFollowUps,
  useNewChat,
  useOpenChanges,
  useSendPrompt,
  useWidgetCall,
  useWidgetCode,
  useWidgets,
  WELCOME,
  WidgetChip,
  WidgetCode,
  WidgetFrame,
  WidgetStatusLine,
  widgetStatusText,
  type WidgetCall,
  type WidgetEntry,
} from "../lib/widgets";

/** Under this width the sidebar is a drawer, as `@max-[720px]` says in CSS. */
const DRAWER_BELOW = 720;

/** What a widget card reads from the shell around it. */
type Shell = {
  /** The call drawn over the whole centre pane. */
  fullId: string | null;
  /** The call a jump has just landed on. */
  markedId: string | null;
  /** Puts the widget with this title on full screen; `null` puts it back. */
  setFull: (title: string | null) => void;
  /** Scrolls to a call's card, marks it and moves the focus there. */
  reveal: (toolCallId: string) => void;
};

const ShellContext = createContext<Shell>({
  fullId: null,
  markedId: null,
  setFull: () => {},
  reveal: () => {},
});

const subscribeToNothing = () => () => {};
const readShortcut = () =>
  /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘B" : "Ctrl+B";
const serverShortcut = () => "Ctrl+B";

const hintClass = cn("text-muted-foreground px-2 py-1.5", text.bodySm);

/**
 * Sidebar workspace: an app shell. The chats and this chat's widgets are
 * listed on the left, the thread is in the middle, and a widget is a framed
 * card that can take over the whole centre pane.
 */
export function WorkspaceVariant() {
  const root = useRef<HTMLDivElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const focusWasInSidebar = useRef(false);
  const sidebarId = useId();
  const chat = useAuiState((s) => s.threads.mainThreadId);
  const widgets = useWidgets();

  // `picked` is the person's choice; without one the sidebar is open beside
  // the thread and closed as a drawer.
  const [nav, setNav] = useState<{
    narrow: boolean | null;
    picked: boolean | null;
  }>({ narrow: null, picked: null });
  const narrow = nav.narrow === true;
  const open = nav.picked ?? !narrow;
  const drawerOpen = narrow && open;

  // Full screen is held by widget title, so it follows the widget to the call
  // an edit moves it to. It ends when another chat opens, and when a widget
  // writes a prompt in the composer that the card covers: `draft` is what the
  // composer held when full screen began.
  const [view, setView] = useState<{
    chat: string;
    full: string | null;
    draft: string | null;
  }>({ chat, full: null, draft: null });
  const draft = useAuiState((s) =>
    view.full === null ? null : s.thread.composer.text,
  );
  if (view.chat !== chat) setView({ chat, full: null, draft: null });
  else if (view.full !== null && draft !== null && draft !== view.draft)
    setView(
      view.draft === null
        ? { ...view, draft }
        : { chat, full: null, draft: null },
    );
  const fullEntry =
    view.chat === chat && view.full !== null
      ? widgets.find((entry) => entry.title === view.full)
      : undefined;
  const fullId =
    fullEntry && !isStoppedEdit(fullEntry.call)
      ? fullEntry.call.toolCallId
      : null;

  const [mark, setMark] = useState<{ id: string } | null>(null);
  useEffect(() => {
    if (!mark) return;
    const timer = setTimeout(() => setMark(null), 1600);
    return () => clearTimeout(timer);
  }, [mark]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = entry.contentRect.width < DRAWER_BELOW;
      setNav((current) =>
        current.narrow === next ? current : { narrow: next, picked: null },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const toggleSidebar = useCallback(() => {
    focusWasInSidebar.current = !!sidebar.current?.contains(
      document.activeElement,
    );
    setNav((current) => ({
      ...current,
      picked: !(current.picked ?? current.narrow !== true),
    }));
  }, []);

  const closeDrawer = useCallback(() => {
    if (!narrow) return;
    focusWasInSidebar.current = !!sidebar.current?.contains(
      document.activeElement,
    );
    setNav((current) => ({ ...current, picked: false }));
  }, [narrow]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key?.toLowerCase() !== "b" ||
        event.metaKey === event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.repeat
      )
        return;
      event.preventDefault();
      toggleSidebar();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  useEffect(() => {
    if (drawerOpen)
      sidebar.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [drawerOpen]);

  // A sidebar that closes takes its focus with it: the focus goes back to the
  // toggle, or to the full screen card that covers the toggle.
  useEffect(() => {
    if (!open && focusWasInSidebar.current)
      (
        root.current?.querySelector<HTMLElement>("[data-full]") ??
        toggle.current
      )?.focus();
    focusWasInSidebar.current = false;
  }, [open]);

  const setFull = useCallback(
    (title: string | null) => setView({ chat, full: title, draft: null }),
    [chat],
  );

  const reveal = useCallback(
    (toolCallId: string) => {
      setView((current) =>
        current.full === null
          ? current
          : { ...current, full: null, draft: null },
      );
      setMark({ id: toolCallId });
      closeDrawer();
      // After the commit: the drawer no longer makes the thread inert, and a
      // card that was on full screen is back in the thread.
      requestAnimationFrame(() => {
        const card = root.current?.querySelector<HTMLElement>(
          `[data-widget-call="${CSS.escape(toolCallId)}"]`,
        );
        if (!card) return;
        card.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
        card.focus({ preventScroll: true });
      });
    },
    [closeDrawer],
  );

  const shell = useMemo<Shell>(
    () => ({ fullId, markedId: mark?.id ?? null, setFull, reveal }),
    [fullId, mark, setFull, reveal],
  );

  return (
    <ShellContext.Provider value={shell}>
      <div
        ref={root}
        data-variant="workspace"
        className={cn(variantRoot, "@container")}
      >
        {drawerOpen && (
          <div
            aria-hidden
            onClick={closeDrawer}
            className="absolute inset-0 z-10 cursor-pointer bg-black/20 dark:bg-black/50"
          />
        )}
        <Sidebar
          id={sidebarId}
          sidebarRef={sidebar}
          state={nav.narrow === null ? "auto" : open ? "open" : "closed"}
          floats={narrow}
          widgets={widgets}
          onClose={closeDrawer}
        />
        {/* A full screen card is the one visible thing in a hidden pane, so
            nothing under it can be clicked or take the focus, and the thread
            under it stays where it was scrolled to. */}
        <ThreadPrimitive.Root
          inert={drawerOpen}
          className={cn(
            "relative isolate flex min-w-0 flex-1 flex-col",
            fullId && "invisible",
          )}
        >
          <TopBar
            open={open}
            controls={sidebarId}
            toggleRef={toggle}
            onToggle={toggleSidebar}
          />
          <ThreadPrimitive.Viewport
            className={cn(
              "gfc-scroll flex min-h-0 flex-1 flex-col px-4",
              fullId ? "overflow-hidden" : "overflow-y-auto",
            )}
          >
            <div className="mx-auto flex w-full max-w-190 flex-1 flex-col pt-6">
              <AuiIf condition={(s) => s.thread.isEmpty}>
                <Welcome />
              </AuiIf>
              <div className="flex flex-col gap-6 pb-8 empty:hidden">
                <ThreadPrimitive.Messages>
                  {renderMessage}
                </ThreadPrimitive.Messages>
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
                <FollowUps />
                <Composer />
                {(narrow || !open) && (
                  <p
                    className={cn(
                      "text-muted-foreground text-center",
                      text.small,
                    )}
                  >
                    {WELCOME.note}
                  </p>
                )}
              </ThreadPrimitive.ViewportFooter>
            </div>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </div>
    </ShellContext.Provider>
  );
}

/** The bar over the thread: the sidebar toggle and the name of the chat. */
function TopBar({
  open,
  controls,
  toggleRef,
  onToggle,
}: {
  open: boolean;
  controls: string;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const title = useAuiState((s) => s.threadListItem.title) ?? "New chat";
  const newChat = useNewChat();
  const shortcut = useSyncExternalStore(
    subscribeToNothing,
    readShortcut,
    serverShortcut,
  );
  const label = open ? "Close the sidebar" : "Open the sidebar";

  return (
    <header
      className={cn(
        hairline,
        "flex h-11 shrink-0 items-center gap-1 border-b px-2 pointer-coarse:h-12",
      )}
    >
      <IconButton
        ref={toggleRef}
        label={label}
        tooltip={`${label} (${shortcut})`}
        icon={icons.sidebar}
        aria-expanded={open}
        aria-controls={controls}
        aria-keyshortcuts="Meta+B Control+B"
        onClick={onToggle}
      />
      <h2 className={cn("min-w-0 flex-1 truncate px-1", weight.strong)}>
        {title}
      </h2>
      {!open && (
        <IconButton label="New chat" icon={icons.newChat} onClick={newChat} />
      )}
    </header>
  );
}

/**
 * The sidebar: a new chat, the chats of this visit and the widgets of the
 * open chat. Beside the thread it is a column that slides shut; on a narrow
 * block it is a drawer that closes once something is picked.
 */
function Sidebar({
  id,
  sidebarRef,
  state,
  floats,
  widgets,
  onClose,
}: {
  id: string;
  sidebarRef: RefObject<HTMLElement | null>;
  /** `auto` until the block has been measured: its width decides in CSS. */
  state: "auto" | "open" | "closed";
  /** A drawer over the thread, not a column beside it. */
  floats: boolean;
  widgets: readonly WidgetEntry[];
  /** Closes the drawer. It does nothing while the sidebar is a column. */
  onClose: () => void;
}) {
  const { reveal } = useContext(ShellContext);
  const newChat = useNewChat();
  const newChatButton = useRef<HTMLButtonElement>(null);
  const chatsId = useId();
  const widgetsId = useId();

  return (
    <nav
      id={id}
      ref={sidebarRef}
      aria-label="Chats and widgets"
      data-nav={state}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className={cn(
        "flex w-60 shrink-0 flex-col transition-[margin,visibility] duration-200 ease-out motion-reduce:transition-none",
        "data-[nav=closed]:invisible data-[nav=closed]:-ms-60",
        "@max-[720px]:data-[nav=auto]:invisible @max-[720px]:data-[nav=auto]:-ms-60",
        floats
          ? cn(
              floating,
              denseGlass,
              "absolute inset-y-0 start-0 z-20 border-y-0 border-s-0",
            )
          : cn(hairline, "border-e"),
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 px-2 pointer-coarse:h-12">
        <button
          ref={newChatButton}
          type="button"
          onClick={() => {
            onClose();
            newChat();
          }}
          className={cn(listRowClass, "min-w-0 flex-1")}
        >
          <Icon {...icons.newChat} />
          New chat
        </button>
        {floats && (
          <IconButton
            label="Close the sidebar"
            icon={icons.close}
            onClick={onClose}
          />
        )}
      </div>
      <div className="gfc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 pb-2">
        <ThreadListPrimitive.Root
          role="group"
          aria-labelledby={chatsId}
          className="flex flex-col gap-px"
        >
          <MenuLabel id={chatsId}>Chats</MenuLabel>
          <AuiIf condition={(s) => s.threads.threadIds.length === 0}>
            <p className={hintClass}>Chats from this visit are listed here.</p>
          </AuiIf>
          <ThreadListPrimitive.Items>
            {() => (
              <ChatRow
                onPick={onClose}
                onDelete={() => newChatButton.current?.focus()}
              />
            )}
          </ThreadListPrimitive.Items>
        </ThreadListPrimitive.Root>
        <div
          role="group"
          aria-labelledby={widgetsId}
          className="flex flex-col gap-px"
        >
          <MenuLabel id={widgetsId}>Widgets</MenuLabel>
          {widgets.length === 0 && (
            <p className={hintClass}>
              Widgets made in this chat are listed here.
            </p>
          )}
          {widgets.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => reveal(entry.call.toolCallId)}
              className={listRowClass}
            >
              <Icon {...glyphFor(entry.icon)} />
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.calls.some((call) => call.status === "streaming") && (
                <>
                  <LiveDot />
                  <span className="sr-only">Being written</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      <p
        className={cn(
          hairline,
          "text-muted-foreground shrink-0 border-t px-4 py-3",
          text.small,
        )}
      >
        {WELCOME.note}
      </p>
    </nav>
  );
}

function Welcome() {
  return (
    <div className="@container my-auto flex flex-col items-center gap-6 pb-8">
      <h1 className={cn("text-center font-sans", text.title, weight.heading)}>
        {WELCOME.title}
      </h1>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 @lg:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            onClick={focusComposer}
            className={cn(
              paper,
              radius.lg,
              text.body,
              weight.label,
              "hover:bg-accent focus-visible:border-ring flex h-11 w-full min-w-0 items-center gap-2.5 px-3 text-start transition-colors outline-none disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
            )}
          >
            <Icon
              {...glyphFor(suggestion.icon)}
              className="text-muted-foreground"
            />
            <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

/** What to ask next, as chips pinned over the composer. */
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

// Nothing between a widget card and the centre pane may be positioned: a card
// on full screen is laid out against the pane, from where it is in the thread.
function AssistantMessage() {
  const copied = useAuiState((s) => s.message.isCopied);

  return (
    <MessagePrimitive.Root className="group flex min-w-0 flex-col gap-3">
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
            return (
              <ThreadWidget toolCallId={part.toolCallId}>
                {part.toolUI}
              </ThreadWidget>
            );
          return <></>;
        }}
      </MessagePrimitive.Parts>
      <ActionBarPrimitive.Root
        hideWhenRunning
        className="-ms-1.5 flex h-7 gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:h-9 pointer-coarse:opacity-100"
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
 * A widget call in its message. The call that draws the widget now is a card
 * with the live frame; a call that a later one replaced is a chip that leads
 * to the card that replaced it; an edit that was stopped is one line.
 */
function ThreadWidget({
  toolCallId,
  children,
}: {
  toolCallId: string;
  children: ReactNode;
}) {
  const call = useWidgetCall(toolCallId);
  const widgets = useWidgets();
  const { reveal } = useContext(ShellContext);
  if (!call) return null;
  if (isStoppedEdit(call)) return <WidgetStatusLine toolCallId={toolCallId} />;

  const entry = widgets.find((item) => item.title === call.title);
  if (call.status === "ready" && !call.current) {
    const latest = entry?.call.toolCallId;
    return (
      <WidgetChip
        toolCallId={toolCallId}
        onOpen={() => {
          if (latest) reveal(latest);
        }}
        label={`${call.label}, earlier version. Go to the newest version`}
      />
    );
  }

  return (
    <WidgetCard
      call={call}
      updating={
        call.status === "ready" &&
        !!entry?.calls.some((other) => other.status === "streaming")
      }
    >
      {children}
    </WidgetCard>
  );
}

/**
 * A widget as a card: a header with its name, what it is doing and its
 * controls, the live frame, and its source on request. On full screen the
 * same element is laid over the centre pane with CSS; the frame never moves
 * in the document, because a frame that moves loads again.
 */
function WidgetCard({
  call,
  updating,
  children,
}: {
  call: WidgetCall;
  /** A change to this widget is being written in a later call. */
  updating: boolean;
  children: ReactNode;
}) {
  const { fullId, markedId, setFull } = useContext(ShellContext);
  const running = useAuiState((s) => s.thread.isRunning);
  const send = useSendPrompt();
  const changes = useOpenChanges(call.title);
  const code = useWidgetCode(call.toolCallId);
  const [showCode, setShowCode] = useState(false);
  const [height, setHeight] = useState<number>();
  const card = useRef<HTMLElement>(null);
  const fullButton = useRef<HTMLButtonElement>(null);
  const changePicked = useRef(false);

  const id = call.toolCallId;
  const full = fullId === id;
  const ready = call.status === "ready";
  const streaming = call.status === "streaming";

  // Full screen comes to this card from the version it replaced, whose
  // controls took the focus with them, or leaves it with the focus inside.
  const wasFull = useRef(full);
  useEffect(() => {
    if (full === wasFull.current) return;
    wasFull.current = full;
    const active = document.activeElement;
    if (
      full
        ? !active || active === document.body
        : card.current?.contains(active)
    )
      fullButton.current?.focus({ preventScroll: true });
  }, [full]);

  const toggleFull = () => {
    // The card leaves the flow, so its place in the thread is kept open.
    if (!full) setHeight(card.current?.offsetHeight);
    setFull(full ? null : call.title);
  };

  return (
    <div className="min-w-0" style={full ? { height } : undefined}>
      <section
        ref={card}
        tabIndex={-1}
        data-widget-call={id}
        data-full={full ? "" : undefined}
        data-marked={markedId === id ? "" : undefined}
        aria-label={call.label}
        onKeyDown={(event) => {
          // The card's menu is elsewhere in the document and closes itself.
          if (
            event.key === "Escape" &&
            full &&
            event.currentTarget.contains(event.target as Node)
          )
            setFull(null);
        }}
        className={cn(
          paper,
          "focus-visible:border-ring flex min-w-0 scroll-mt-4 flex-col transition-colors duration-300 outline-none data-marked:border-(--brand) motion-reduce:transition-none",
          full
            ? "dark:bg-background visible absolute inset-0 z-20 rounded-none border-0"
            : radius.lg,
        )}
      >
        <header
          className={cn(
            hairline,
            "flex min-h-10 shrink-0 items-center gap-2 border-b py-1 ps-3 pe-1.5",
          )}
        >
          <Icon
            {...glyphFor(call.icon)}
            className="text-muted-foreground size-3.5"
          />
          <span className={cn("min-w-0 truncate", weight.strong)}>
            {call.label}
          </span>
          {streaming ? (
            <WidgetStatusLine toolCallId={id} className="shrink-0" />
          ) : (
            <span
              className={cn(
                "text-muted-foreground flex shrink-0 items-center gap-1.5",
                text.bodySm,
                ready && !updating && "@max-[400px]:hidden",
              )}
            >
              {updating && <LiveDot />}
              {updating ? "Updating" : widgetStatusText(call)}
            </span>
          )}
          <span className="min-w-0 flex-1" />
          {(ready || full) && (
            <div className="flex shrink-0 items-center gap-0.5">
              {changes.length > 0 && (
                <Menu>
                  <MenuTrigger
                    disabled={running}
                    render={
                      <IconButton label="Change" icon={icons.edit} side="top" />
                    }
                  />
                  <MenuContent
                    align="end"
                    finalFocus={() => {
                      if (!changePicked.current) return true;
                      changePicked.current = false;
                      if (full) return fullButton.current;
                      focusComposer();
                      return false;
                    }}
                  >
                    <MenuLabel>Scripted changes</MenuLabel>
                    {changes.map((prompt) => (
                      <MenuItem
                        key={prompt}
                        onClick={() => {
                          changePicked.current = true;
                          send(prompt);
                        }}
                      >
                        {prompt}
                      </MenuItem>
                    ))}
                  </MenuContent>
                </Menu>
              )}
              {ready && (
                <IconButton
                  label={showCode ? "Hide the code" : "Show the code"}
                  icon={icons.code}
                  side="top"
                  aria-expanded={showCode}
                  className="aria-expanded:bg-accent aria-expanded:text-foreground"
                  onClick={() => setShowCode((value) => !value)}
                />
              )}
              <IconButton
                ref={fullButton}
                label={full ? "Exit full screen" : "Full screen"}
                icon={full ? icons.collapse : icons.expand}
                side="top"
                onClick={toggleFull}
              />
            </div>
          )}
        </header>
        <div
          className={cn(
            "flex min-w-0 flex-col",
            full &&
              "gfc-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-col gap-3 p-4",
              full && "mx-auto w-full max-w-4xl",
            )}
          >
            {!streaming && <WidgetStatusLine toolCallId={id} />}
            <WidgetFrame>{children}</WidgetFrame>
            {showCode && (
              <div className={cn(field, radius.sm, "relative")}>
                <WidgetCode id={id} className="max-h-72 p-3 pe-10" />
                <CopyButton
                  text={code ?? ""}
                  label="Copy the code"
                  side="left"
                  className="absolute end-1.5 top-1.5"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
