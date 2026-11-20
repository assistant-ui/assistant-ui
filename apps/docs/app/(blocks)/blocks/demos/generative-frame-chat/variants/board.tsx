"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  ChatList,
  chipClass,
  Composer,
  CopyButton,
  denseGlass,
  field,
  floating,
  focusBorder,
  focusComposer,
  glyphFor,
  Icon,
  IconButton,
  icons,
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
  textButtonClass,
  variantRoot,
  weight,
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

/** From this root width the chat sits beside the board: `@min-[768px]:`. */
const BESIDE = 768;

/** The band the two pills float in, `pt-15`. A card scrolls up to its edge. */
const TOP = 60;

const grid =
  "mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 @min-[900px]:max-w-6xl @min-[900px]:grid-cols-2";

/** Shows the card of a widget call on the board. */
const RevealContext = createContext<(toolCallId: string) => void>(() => {});

function scrollToCard(board: HTMLElement, card: HTMLElement, smooth: boolean) {
  const top =
    board.scrollTop +
    card.getBoundingClientRect().top -
    board.getBoundingClientRect().top -
    TOP;
  board.scrollTo({
    top,
    behavior:
      smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "smooth"
        : "auto",
  });
}

/**
 * Widget board: the widgets are the page, as cards in a grid. The composer
 * floats at the bottom and the conversation waits in a drawer on the right.
 */
export function BoardVariant() {
  const root = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const chatButton = useRef<HTMLButtonElement>(null);
  const drawerId = useId();
  const widgets = useWidgets();
  const chatId = useAuiState((s) => s.threads.mainThreadId);
  const reply = useAuiState((s) => {
    const last = s.thread.messages.at(-1);
    if (last?.role !== "assistant") return undefined;
    const said = last.content.some(
      (part) => part.type === "text" && part.text.trim() !== "",
    );
    return said || last.status.type === "running" ? last.id : undefined;
  });
  const [open, setOpen] = useState(false);
  const [unreadIn, setUnreadIn] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [marked, setMarked] = useState<{ id: string } | null>(null);
  const unread = !open && unreadIn === chatId;

  useAuiEvent("thread.runStart", () => {
    if (!open) setUnreadIn(chatId);
  });

  useEffect(() => {
    const frame = root.current;
    const bar = dock.current;
    if (!frame || !bar) return;
    const observer = new ResizeObserver(() =>
      frame.style.setProperty("--dock", `${bar.offsetHeight}px`),
    );
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!marked) return;
    const timer = setTimeout(() => setMarked(null), 1600);
    return () => clearTimeout(timer);
  }, [marked]);

  const setDrawer = (next: boolean) => {
    setOpen(next);
    setUnreadIn(null);
  };

  const reveal = useCallback(
    (toolCallId: string) => {
      const entry = widgets.find((item) =>
        item.calls.some((call) => call.toolCallId === toolCallId),
      );
      const card =
        entry &&
        root.current?.querySelector<HTMLElement>(
          `[data-widget="${CSS.escape(entry.id)}"]`,
        );
      const board = card?.closest<HTMLElement>("[data-board]");
      if (!entry || !card || !board) return;
      if ((root.current?.clientWidth ?? 0) < BESIDE) {
        setOpen(false);
        setUnreadIn(null);
      }
      scrollToCard(board, card, true);
      card.focus({ preventScroll: true });
      setMarked({ id: entry.id });
    },
    [widgets],
  );

  return (
    <RevealContext.Provider value={reveal}>
      <ThreadPrimitive.Root
        ref={root}
        data-variant="board"
        className={cn(variantRoot, "@container")}
      >
        <TopBar />
        <div
          className={cn(
            floating,
            "absolute end-3 top-3 z-20 flex h-9 items-center rounded-full p-px pointer-coarse:h-10",
          )}
        >
          <IconButton
            ref={chatButton}
            label={
              open
                ? "Close chat"
                : unread
                  ? "Open chat, new reply"
                  : "Open chat"
            }
            icon={icons.chat}
            aria-expanded={open}
            {...(open ? { "aria-controls": drawerId } : {})}
            className="aria-expanded:bg-accent aria-expanded:text-foreground size-8"
            onClick={() => setDrawer(!open)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && open) setDrawer(false);
            }}
          />
          {unread && (
            <span
              aria-hidden
              className="pointer-events-none absolute end-1.5 top-1.5 size-1.5 rounded-full bg-(--brand)"
            />
          )}
        </div>
        {open && (
          <Drawer
            id={drawerId}
            onClose={() => {
              setDrawer(false);
              chatButton.current?.focus();
            }}
          />
        )}

        <div
          data-board
          className={cn(
            "gfc-scroll absolute inset-y-0 start-0 end-0 overflow-y-auto overscroll-contain px-3 pt-15 pb-[calc(var(--dock,6rem)+0.75rem)]",
            open && "@min-[768px]:end-93",
          )}
        >
          <div className="@container flex min-h-full flex-col">
            {widgets.length === 0 ? (
              <Welcome />
            ) : (
              <div className={grid}>
                {widgets.map((entry) => (
                  <WidgetCard
                    key={entry.id}
                    entry={entry}
                    marked={marked?.id === entry.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          ref={dock}
          className={cn(
            "pointer-events-none absolute start-0 end-0 bottom-0 z-20 flex justify-center px-3 pb-3",
            open && "@min-[768px]:end-93",
          )}
        >
          <div className="@container pointer-events-auto flex w-full max-w-160 flex-col gap-2">
            {!open && reply !== undefined && reply !== dismissed && (
              <ReplyStrip
                onOpen={() => {
                  setDrawer(true);
                  chatButton.current?.focus();
                }}
                onDismiss={() => {
                  setDismissed(reply);
                  setUnreadIn(null);
                  focusComposer();
                }}
              />
            )}
            <FollowUps />
            <Composer surface="glass">
              <p
                className={cn(
                  "text-muted-foreground min-w-0 truncate px-2",
                  text.small,
                )}
              >
                {WELCOME.note}
              </p>
            </Composer>
          </div>
        </div>
      </ThreadPrimitive.Root>
    </RevealContext.Provider>
  );
}

/** The chats of this visit and a new one, in a pill at the top. */
function TopBar() {
  const [open, setOpen] = useState(false);
  const newChat = useNewChat();

  return (
    <div
      className={cn(
        floating,
        "absolute start-3 top-3 z-20 flex h-9 items-center gap-0.5 rounded-full p-px pointer-coarse:h-10",
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <IconButton label="Chats" icon={icons.history} className="size-8" />
          }
        />
        <PopoverContent aria-label="Chats">
          <ChatList
            onPick={() => setOpen(false)}
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
    </div>
  );
}

/** The empty board: the four prompts as cards in the grid the widgets use. */
function Welcome() {
  return (
    <div className="my-auto flex flex-col gap-6 py-6">
      <h1 className={cn("text-center font-sans", text.title, weight.heading)}>
        {WELCOME.title}
      </h1>
      <div className={grid}>
        {SUGGESTIONS.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            onClick={focusComposer}
            className={cn(
              paper,
              radius.lg,
              "hover:bg-accent focus-visible:border-ring flex min-w-0 items-center gap-3 p-3 text-start transition-[background-color,border-color,scale] duration-150 outline-none active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100",
            )}
          >
            <span
              className={cn(
                field,
                "flex size-9 shrink-0 items-center justify-center rounded-full",
              )}
            >
              <Icon {...glyphFor(suggestion.icon)} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className={cn("truncate", weight.strong)}>
                {suggestion.label}
              </span>
              <span
                className={cn("text-muted-foreground truncate", text.bodySm)}
              >
                {suggestion.prompt}
              </span>
            </span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

/**
 * One widget as a card: what it is and what it is doing, its controls, and
 * the live frame of the call that draws it now.
 */
function WidgetCard({
  entry,
  marked,
}: {
  entry: WidgetEntry;
  marked: boolean;
}) {
  const card = useRef<HTMLElement>(null);
  const call = entry.call;
  const latest = entry.calls.at(-1) ?? call;
  const code = useWidgetCode(call.toolCallId);
  const newest = useAuiState((s) => s.thread.messages.at(-1)?.id);
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [wide, setWide] = useState(false);

  const shown = latest.status === "streaming" ? latest : call;
  const live = shown.status === "streaming";
  const ready = call.status === "ready";
  const showCode = ready && codeFor === call.toolCallId;
  // A change that did not land is said here while its reply is the newest.
  const aside =
    latest.toolCallId !== call.toolCallId &&
    (live || latest.messageId === newest);

  // The board follows a card while it is being written: into view when it is
  // above the fold, then up to the top as the widget grows.
  useEffect(() => {
    const element = card.current;
    const board = element?.closest<HTMLElement>("[data-board]");
    if (!live || !element || !board) return;
    const edge = () => board.getBoundingClientRect().top + TOP;
    if (element.getBoundingClientRect().bottom < edge())
      scrollToCard(board, element, false);
    const observer = new ResizeObserver(() => {
      const gap = element.getBoundingClientRect().top - edge();
      if (gap > 1) board.scrollTop += gap;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [live]);

  const toggleWide = () => {
    setWide((value) => !value);
    requestAnimationFrame(() => {
      const element = card.current;
      const board = element?.closest<HTMLElement>("[data-board]");
      if (element && board) scrollToCard(board, element, true);
    });
  };

  return (
    <section
      ref={card}
      tabIndex={-1}
      data-widget={entry.id}
      aria-label={entry.label}
      className={cn(
        paper,
        radius.lg,
        "group/card focus-visible:border-ring flex min-w-0 flex-col transition-colors duration-300 outline-none motion-reduce:transition-none",
        wide && "@min-[900px]:order-first @min-[900px]:col-span-full",
        marked && "border-foreground/40",
      )}
    >
      <header className="flex h-11 items-center gap-2 ps-3 pe-2 pointer-coarse:h-12">
        <Icon {...glyphFor(entry.icon)} className="text-muted-foreground" />
        <h2
          className={cn("min-w-0 truncate font-sans", text.body, weight.strong)}
        >
          {entry.label}
        </h2>
        <p
          className={cn(
            "text-muted-foreground flex shrink-0 items-center gap-1.5",
            text.bodySm,
          )}
        >
          {live && <LiveDot />}
          {widgetStatusText(shown)}
        </p>
        <span className="min-w-0 flex-1" />
        {(ready || live) && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100 has-[[aria-expanded=true]]:opacity-100 has-[[aria-pressed=true]]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100">
            <ChangeMenu title={entry.title} label={entry.label} />
            <IconButton
              label={showCode ? "Show the widget" : "Show the code"}
              icon={icons.code}
              side="top"
              disabled={!ready}
              aria-expanded={showCode}
              className="aria-expanded:bg-accent aria-expanded:text-foreground"
              onClick={() => setCodeFor(showCode ? null : call.toolCallId)}
            />
            <IconButton
              label="Full width"
              icon={wide ? icons.collapse : icons.expand}
              side="top"
              active={wide}
              disabled={!ready}
              className="hidden @min-[900px]:flex"
              onClick={toggleWide}
            />
          </div>
        )}
      </header>
      <div className="min-w-0 px-3 pb-3">
        <WidgetStatusLine
          toolCallId={call.toolCallId}
          dot={false}
          className="mb-2"
        />
        {aside && (
          <WidgetStatusLine
            toolCallId={latest.toolCallId}
            dot={false}
            className="mb-2"
          />
        )}
        {/* The frame stays mounted under the code: unmounting reloads it. */}
        <div className={cn(showCode && "invisible h-0 overflow-hidden")}>
          <WidgetOutlet key={call.toolCallId} toolCallId={call.toolCallId} />
        </div>
        {showCode && (
          <div className={cn(field, radius.sm, "relative")}>
            <WidgetCode id={call.toolCallId} className="max-h-96 p-3 pe-10" />
            <CopyButton
              text={code ?? ""}
              label="Copy the code"
              side="left"
              className="absolute end-1.5 top-1.5"
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** The recorded changes a widget does not have yet, each sent as a prompt. */
function ChangeMenu({ title, label }: { title: string; label: string }) {
  const changes = useOpenChanges(title);
  const send = useSendPrompt();
  const running = useAuiState((s) => s.thread.isRunning);
  const sent = useRef(false);
  if (changes.length === 0) return null;

  return (
    <Menu>
      <MenuTrigger
        disabled={running}
        render={
          <IconButton
            label={`Change the ${lower(label)}`}
            icon={icons.edit}
            side="top"
          />
        }
      />
      <MenuContent
        align="end"
        finalFocus={() => {
          if (!sent.current) return true;
          sent.current = false;
          focusComposer();
          return false;
        }}
      >
        <MenuLabel>Change</MenuLabel>
        {changes.map((prompt) => (
          <MenuItem
            key={prompt}
            disabled={running}
            onClick={() => {
              sent.current = true;
              send(prompt);
            }}
          >
            {prompt}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

/** What to ask next: one scrolling row in a narrow bar, wrapped in a wide one. */
function FollowUps() {
  const followUps = useFollowUps();
  if (followUps.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Suggested next steps"
      className="gfc-scroll -mx-3 overflow-x-auto px-3 @min-[560px]:mx-0 @min-[560px]:overflow-visible @min-[560px]:px-0"
    >
      <div className="mx-auto flex w-max gap-1.5 @min-[560px]:w-auto @min-[560px]:flex-wrap @min-[560px]:justify-center">
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
    </div>
  );
}

function Thinking() {
  return (
    <AuiIf
      condition={(s) =>
        s.message.status?.type === "running" && s.message.content.length === 0
      }
    >
      <p role="status" className={cn("text-muted-foreground", text.bodySm)}>
        <span className="shimmer motion-reduce:animate-none">Thinking</span>
      </p>
    </AuiIf>
  );
}

const renderNewest = () => <NewestText />;

/** The text of the newest reply. Its widgets are on the board. */
function NewestText() {
  const newest = useAuiState(
    (s) => s.message.isLast && s.message.role === "assistant",
  );
  if (!newest) return null;

  return (
    <>
      <Thinking />
      <MessagePrimitive.Parts>
        {({ part }) =>
          part.type === "text" && part.text ? <MarkdownText /> : <></>
        }
      </MessagePrimitive.Parts>
    </>
  );
}

/**
 * The newest reply in a few lines over the composer, so what the assistant
 * says is on screen while the chat drawer is closed.
 */
function ReplyStrip({
  onOpen,
  onDismiss,
}: {
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-label="Newest reply"
      className={cn(
        floating,
        denseGlass,
        radius.lg,
        "flex flex-col gap-1 p-2 ps-3",
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar
          src={ASSISTANT.avatar}
          name={ASSISTANT.name}
          size="xs"
          decorative
        />
        <span className={cn("min-w-0 flex-1 truncate", weight.strong)}>
          {ASSISTANT.name}
        </span>
        <button type="button" className={textButtonClass} onClick={onOpen}>
          Open chat
        </button>
        <IconButton
          label="Hide this reply"
          icon={icons.close}
          side="top"
          onClick={onDismiss}
        />
      </div>
      <div
        className={cn(
          focusBorder,
          radius.sm,
          "gfc-scroll flex max-h-27 flex-col gap-2 overflow-y-auto overscroll-contain pe-1 pb-1",
        )}
      >
        <ThreadPrimitive.Messages>{renderNewest}</ThreadPrimitive.Messages>
      </div>
    </section>
  );
}

/** The conversation, in a panel over the right of the board. */
function Drawer({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <section
      id={id}
      aria-label="Chat"
      className={cn(
        floating,
        denseGlass,
        radius.lg,
        "absolute end-3 top-15 bottom-[calc(var(--dock,6rem)+0.5rem)] z-30 flex w-90 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden transition-[opacity,translate] duration-150 motion-reduce:transition-none @min-[768px]:bottom-3 starting:translate-x-2 starting:opacity-0",
      )}
    >
      <ThreadPrimitive.Viewport
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) onClose();
        }}
        className="gfc-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3"
      >
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <p
            className={cn(
              "text-muted-foreground m-auto max-w-56 text-center",
              text.bodySm,
            )}
          >
            The conversation shows here once you ask for something.
          </p>
        </AuiIf>
        <div className="flex flex-col gap-5 empty:hidden">
          <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
        </div>
        <ThreadPrimitive.ViewportFooter className="pointer-events-none sticky bottom-0 flex h-0 justify-center">
          <ThreadPrimitive.ScrollToBottom asChild>
            <IconButton
              label="Scroll to the newest message"
              icon={icons.arrowDown}
              side="top"
              className={cn(
                paper,
                "hover:bg-accent pointer-events-auto absolute bottom-2 shadow-(--float-shadow) disabled:invisible",
              )}
            />
          </ThreadPrimitive.ScrollToBottom>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </section>
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
          radius.lg,
          "max-w-[85%] px-3 py-1.5 text-[0.9375rem] leading-6 wrap-break-word whitespace-pre-wrap",
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
      <p className={cn("flex items-center gap-2", weight.strong)}>
        <Avatar src={ASSISTANT.avatar} name={ASSISTANT.name} decorative />
        {ASSISTANT.name}
      </p>
      <Thinking />
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text") return part.text ? <MarkdownText /> : <></>;
          if (isWidgetPart(part))
            return <CallChip toolCallId={part.toolCallId} />;
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
 * A widget call in the conversation. Its frame is on the board, so here it is
 * a chip that leads to its card; an edit that was stopped is one line.
 */
function CallChip({ toolCallId }: { toolCallId: string }) {
  const call = useWidgetCall(toolCallId);
  const widgets = useWidgets();
  const reveal = useContext(RevealContext);
  if (!call) return null;
  if (isStoppedEdit(call)) return <WidgetStatusLine toolCallId={toolCallId} />;

  const onBoard = widgets.some((entry) =>
    entry.calls.some((item) => item.toolCallId === toolCallId),
  );
  if (!onBoard) return <WidgetChip toolCallId={toolCallId} />;

  return (
    <WidgetChip
      toolCallId={toolCallId}
      onOpen={() => reveal(toolCallId)}
      label={`${call.label}, ${lower(widgetStatusText(call))}. Show it on the board`}
    />
  );
}
