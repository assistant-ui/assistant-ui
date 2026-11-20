"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  ChatList,
  chipClass,
  composerGlass,
  composerInputRef,
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

const StageContext = createContext<{
  shownId: string | undefined;
  show: (id: string) => void;
}>({ shownId: undefined, show: () => {} });

/*
 * A widget that is off stage keeps its frame: laid out at full width and
 * clipped to no height, the way the toolkit hides a frame it is preparing,
 * so its scripts and timers keep running and nothing reloads on the way back.
 */
const parkedClass = "invisible absolute inset-x-0 top-0 h-0 overflow-hidden";

const CAPTION_HEIGHT = 104;

const pillClass = cn(
  focusBorder,
  text.body,
  weight.label,
  "text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=true]:bg-accent aria-[current=true]:text-foreground flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none pointer-coarse:h-9",
);

const tileClass = cn(
  paper,
  radius.md,
  text.body,
  weight.label,
  "hover:bg-accent focus-visible:border-ring flex h-10 min-w-0 items-center gap-2.5 px-3 text-start transition-[background-color,border-color,scale] duration-150 outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100 pointer-coarse:h-11",
);

const stepClass =
  "size-8 aria-disabled:pointer-events-none aria-disabled:opacity-40";

/**
 * Stage: one widget at a time, large and centred, with a command bar under
 * it. The strip at the top moves between the widgets of the chat, the newest
 * reply is a caption over the widget, and the thread is in a popover.
 */
export function StageVariant() {
  const widgets = useWidgets();
  const calls = useWidgetCalls();
  const replyId = useReplyId();
  const stage = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string>();
  const [followed, setFollowed] = useState<string>();
  const [codeFor, setCodeFor] = useState<string>();
  const [historyOpen, setHistoryOpen] = useState(false);

  const liveCall = calls.findLast((call) => call.status === "streaming");
  const liveEntry = liveCall
    ? widgets.find((entry) =>
        entry.calls.some((call) => call.toolCallId === liveCall.toolCallId),
      )
    : undefined;
  const liveKey =
    liveCall && liveEntry
      ? `${liveEntry.id} ${liveCall.toolCallId}`
      : undefined;
  // A call that starts takes the stage once; after that the strip is free.
  if (liveKey !== followed) {
    setFollowed(liveKey);
    if (liveEntry) {
      setPicked(liveEntry.id);
      setCodeFor(undefined);
    }
  }

  const shown = widgets.find((entry) => entry.id === picked) ?? widgets.at(-1);
  const shownId = shown?.id;
  const codeOpen =
    shown?.call.status === "ready" &&
    !shown.calls.some((call) => call.status === "streaming") &&
    codeFor === shown.id;

  useEffect(() => {
    stage.current?.scrollTo({ top: 0 });
  }, [shownId, replyId]);

  const show = useCallback((id: string) => {
    setPicked(id);
    setHistoryOpen(false);
  }, []);
  const state = useMemo(() => ({ shownId, show }), [shownId, show]);

  return (
    <StageContext.Provider value={state}>
      <ThreadPrimitive.Root
        data-variant="stage"
        className={cn(variantRoot, "@container flex-col")}
      >
        <div
          ref={stage}
          className="gfc-scroll flex min-h-0 flex-1 scroll-pt-16 scroll-pb-40 flex-col overflow-y-auto"
        >
          <div className="from-background via-background/80 pointer-events-none sticky top-0 z-20 flex shrink-0 flex-col items-start gap-2 bg-linear-to-b to-transparent p-3 pb-4 @2xl:grid @2xl:grid-cols-[1fr_minmax(0,auto)_1fr] @2xl:items-center">
            <Corner
              historyOpen={historyOpen}
              onHistoryOpenChange={setHistoryOpen}
            />
            {widgets.length > 1 && <Strip widgets={widgets} />}
          </div>
          <div className="flex flex-1 flex-col px-4">
            <div className="m-auto flex w-full max-w-[45rem] flex-col gap-3 py-2">
              <AuiIf condition={(s) => s.thread.isEmpty}>
                <Welcome />
              </AuiIf>
              {shown && (
                <StageHeader
                  entry={shown}
                  codeOpen={codeOpen}
                  onToggleCode={() =>
                    setCodeFor(codeOpen ? undefined : shown.id)
                  }
                />
              )}
              <Caption solo={!shown} />
              {shown && (
                <Slides widgets={widgets} shown={shown} codeOpen={codeOpen} />
              )}
            </div>
          </div>
          <Dock />
        </div>
      </ThreadPrimitive.Root>
    </StageContext.Provider>
  );
}

function useReplyId() {
  return useAuiState((s) => {
    const last = s.thread.messages.at(-1);
    return last?.role === "assistant" ? last.id : undefined;
  });
}

function Corner({
  historyOpen,
  onHistoryOpenChange,
}: {
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
}) {
  const [chatsOpen, setChatsOpen] = useState(false);
  const newChat = useNewChat();

  return (
    <div
      className={cn(
        floating,
        "pointer-events-auto flex h-9 items-center gap-0.5 justify-self-start rounded-full p-px pointer-coarse:h-10",
      )}
    >
      <Popover open={historyOpen} onOpenChange={onHistoryOpenChange}>
        <PopoverTrigger
          render={
            <IconButton
              label="Conversation history"
              icon={icons.history}
              className="size-8"
            />
          }
        />
        <PopoverContent
          aria-label="Conversation history"
          className="has-[[role=region]:focus-visible]:border-ring overflow-hidden"
        >
          <Transcript />
        </PopoverContent>
      </Popover>
      <Popover open={chatsOpen} onOpenChange={setChatsOpen}>
        <PopoverTrigger
          render={
            <IconButton label="Chats" icon={icons.chat} className="size-8" />
          }
        />
        <PopoverContent aria-label="Chats">
          <ChatList
            onPick={() => setChatsOpen(false)}
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

function Strip({ widgets }: { widgets: readonly WidgetEntry[] }) {
  const { shownId, show } = useContext(StageContext);
  const scroller = useRef<HTMLDivElement>(null);
  const index = widgets.findIndex((entry) => entry.id === shownId);
  const count = widgets.length;

  useEffect(() => {
    const strip = scroller.current;
    const pill = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!strip || !pill) return;
    const box = strip.getBoundingClientRect();
    const rect = pill.getBoundingClientRect();
    if (rect.left < box.left) strip.scrollLeft += rect.left - box.left - 4;
    else if (rect.right > box.right)
      strip.scrollLeft += rect.right - box.right + 4;
  }, [shownId, count]);

  const step = (by: number) => {
    const target = widgets[index + by];
    if (target) show(target.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const to =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? count - 1
          : event.key === (rtl ? "ArrowLeft" : "ArrowRight")
            ? index + 1
            : event.key === (rtl ? "ArrowRight" : "ArrowLeft")
              ? index - 1
              : -1;
    const target = widgets[to];
    if (!target) return;
    event.preventDefault();
    show(target.id);
    event.currentTarget.querySelectorAll<HTMLElement>("button")[to]?.focus();
  };

  return (
    <div
      className={cn(
        floating,
        denseGlass,
        "pointer-events-auto flex h-9 max-w-full min-w-0 items-center gap-0.5 self-center rounded-full p-px pointer-coarse:h-10",
      )}
    >
      <IconButton
        label="Previous widget"
        icon={icons.chevronLeft}
        className={stepClass}
        aria-disabled={index <= 0}
        onClick={() => step(-1)}
      />
      <div
        ref={scroller}
        role="toolbar"
        aria-label="Widgets in this chat"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex min-w-0 [scrollbar-width:none] items-center gap-0.5 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
      >
        {widgets.map((entry) => {
          const current = entry.id === shownId;
          const live = entry.calls.findLast(
            (call) => call.status === "streaming",
          );
          return (
            <button
              key={entry.id}
              type="button"
              tabIndex={current ? 0 : -1}
              aria-current={current ? "true" : undefined}
              onClick={() => show(entry.id)}
              className={pillClass}
            >
              <Icon {...glyphFor(entry.icon)} />
              {entry.label}
              {live && (
                <>
                  <LiveDot />
                  <span className="sr-only">{widgetStatusText(live)}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <IconButton
        label="Next widget"
        icon={icons.chevronRight}
        className={stepClass}
        aria-disabled={index >= count - 1}
        onClick={() => step(1)}
      />
    </div>
  );
}

function Welcome() {
  return (
    <div className="mx-auto flex w-full max-w-[35rem] flex-col items-center gap-6 py-4">
      <h1 className={cn("text-center font-sans", text.title, weight.heading)}>
        {WELCOME.title}
      </h1>
      <div className="grid w-full grid-cols-1 gap-2 @md:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            onClick={focusComposer}
            className={tileClass}
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

function StageHeader({
  entry,
  codeOpen,
  onToggleCode,
}: {
  entry: WidgetEntry;
  codeOpen: boolean;
  onToggleCode: () => void;
}) {
  const running = useAuiState((s) => s.thread.isRunning);
  const changes = useOpenChanges(entry.title);
  const send = useSendPrompt();
  const live = entry.calls.findLast((call) => call.status === "streaming");
  const settled = !live && entry.call.status === "ready";

  return (
    <header className="flex min-h-7 items-center gap-2 pointer-coarse:min-h-9">
      <span className="text-muted-foreground flex size-5 shrink-0 items-center justify-center">
        <Icon {...glyphFor(entry.icon)} />
      </span>
      <h2 className={cn("min-w-0 truncate", text.body, weight.strong)}>
        {entry.label}
      </h2>
      {live ? (
        <WidgetStatusLine
          toolCallId={live.toolCallId}
          className="shrink-0 whitespace-nowrap"
        />
      ) : (
        <span className={cn("text-muted-foreground shrink-0", text.bodySm)}>
          {widgetStatusText(entry.call)}
        </span>
      )}
      <span className="min-w-0 flex-1" />
      {settled && (
        <IconButton
          label="Code"
          icon={icons.code}
          side="top"
          active={codeOpen}
          onClick={onToggleCode}
        />
      )}
      {settled && changes.length > 0 && (
        <Menu>
          <MenuTrigger
            disabled={running}
            render={
              <IconButton
                label="Change this widget"
                icon={icons.edit}
                side="top"
              />
            }
          />
          <MenuContent align="end">
            <MenuLabel>Change the {lower(entry.label)}</MenuLabel>
            {changes.map((prompt) => (
              <MenuItem
                key={prompt}
                onClick={() => {
                  send(prompt);
                  focusComposer();
                }}
              >
                {prompt}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      )}
    </header>
  );
}

/**
 * The newest reply, since no thread is on screen. A reply that made or
 * changed a widget is held to a few lines; an answer in words starts open.
 */
function Caption({ solo }: { solo: boolean }) {
  const replyId = useReplyId();
  const reply = useAuiState((s) => {
    const last = s.thread.messages.at(-1);
    if (last?.role !== "assistant")
      return s.thread.isRunning ? "thinking" : "none";
    if (last.content.some((part) => part.type === "text" && part.text.trim()))
      return last.content.some((part) => part.type === "tool-call")
        ? "caption"
        : "answer";
    if (last.content.length > 0) return "none";
    return last.status.type === "running" ? "thinking" : "stopped";
  });
  const renderReply = useCallback(
    ({ message }: { message: { id: string } }) =>
      message.id === replyId ? (
        <MessagePrimitive.Parts>
          {({ part }) =>
            part.type === "text" && part.text ? <MarkdownText /> : <></>
          }
        </MessagePrimitive.Parts>
      ) : null,
    [replyId],
  );
  if (reply === "none") return null;

  return (
    <div className="flex max-w-[40rem] gap-2">
      <Avatar
        src={ASSISTANT.avatar}
        name={ASSISTANT.name}
        size="xs"
        className="mt-0.5"
      />
      {reply === "thinking" || reply === "stopped" ? (
        <p
          role="status"
          className={cn(
            "text-muted-foreground flex min-h-6 items-center",
            text.bodySm,
          )}
        >
          {reply === "thinking" ? (
            <span className="shimmer motion-reduce:animate-none">Thinking</span>
          ) : (
            "Stopped before anything was written."
          )}
        </p>
      ) : (
        <Clamp key={replyId} startOpen={reply === "answer"} solo={solo}>
          <ThreadPrimitive.Messages>{renderReply}</ThreadPrimitive.Messages>
        </Clamp>
      )}
    </div>
  );
}

function Clamp({
  startOpen,
  solo,
  children,
}: {
  startOpen: boolean;
  /** Nothing else is on the stage, so the text is never held back. */
  solo: boolean;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [toggled, setToggled] = useState<boolean>();
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setTall(element.offsetHeight > CAPTION_HEIGHT + 1),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const open = solo || (toggled ?? startOpen);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
      <div
        className={cn(
          "relative w-full",
          !open && "max-h-[6.5rem] overflow-hidden",
        )}
      >
        <div ref={body} className="flex flex-col gap-2">
          {children}
        </div>
        {tall && !open && (
          <div
            aria-hidden
            className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t to-transparent"
          />
        )}
      </div>
      {tall && !solo && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setToggled(!open)}
          className={cn(
            textButtonClass,
            "text-muted-foreground hover:text-foreground -ms-2.5",
            text.bodySm,
          )}
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function Slides({
  widgets,
  shown,
  codeOpen,
}: {
  widgets: readonly WidgetEntry[];
  shown: WidgetEntry;
  codeOpen: boolean;
}) {
  const last = shown.calls.at(-1);

  return (
    <section
      aria-label={shown.label}
      className="relative flex min-w-0 flex-col gap-3"
    >
      {last && last.status !== "streaming" && (
        <WidgetStatusLine toolCallId={last.toolCallId} />
      )}
      {widgets.map((entry) => {
        const parked = codeOpen || entry.id !== shown.id;
        return (
          <div
            key={entry.id}
            inert={parked}
            className={parked ? parkedClass : undefined}
          >
            <WidgetOutlet
              key={entry.call.toolCallId}
              toolCallId={entry.call.toolCallId}
            />
          </div>
        );
      })}
      {codeOpen && <Source toolCallId={shown.call.toolCallId} />}
    </section>
  );
}

function Source({ toolCallId }: { toolCallId: string }) {
  const code = useWidgetCode(toolCallId);

  return (
    <div className={cn(field, radius.lg, "relative")}>
      <WidgetCode
        id={toolCallId}
        className={cn(radius.lg, "max-h-[28rem] p-4 pe-12")}
      />
      <CopyButton
        text={code ?? ""}
        label="Copy the code"
        side="left"
        className="absolute end-2 top-2"
      />
    </div>
  );
}

/**
 * The command bar and what floats with it. The follow-up row keeps its height
 * when it is empty, so the stage does not shift when a reply ends.
 */
function Dock() {
  const followUps = useFollowUps();

  return (
    <div className="from-background via-background/80 pointer-events-none sticky bottom-0 z-20 flex shrink-0 flex-col items-center gap-2 bg-linear-to-t to-transparent px-3 pt-4 pb-3">
      <div
        {...(followUps.length > 0
          ? { role: "group", "aria-label": "Suggested next steps" }
          : {})}
        className="gfc-scroll pointer-events-auto flex min-h-8 max-w-full gap-1.5 overflow-x-auto @2xl:max-w-[45rem] @2xl:flex-wrap @2xl:justify-center @2xl:overflow-visible pointer-coarse:min-h-9"
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
      <CommandBar />
      <p className={cn("text-muted-foreground text-center", text.small)}>
        {WELCOME.note}
      </p>
    </div>
  );
}

function CommandBar() {
  const running = useAuiState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root
      className={cn(
        composerGlass,
        "pointer-events-auto flex w-full max-w-[35rem] items-end gap-1 p-1.5",
      )}
    >
      <ComposerPrimitive.Input
        ref={composerInputRef}
        rows={1}
        placeholder="Ask for a widget or a change"
        aria-label="Message the assistant"
        className="placeholder:text-muted-foreground/60 max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2.5 py-1.5 text-base leading-6 outline-none"
      />
      {running ? (
        <ComposerPrimitive.Cancel asChild>
          <IconButton
            label="Stop"
            icon={icons.stop}
            side="top"
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground my-1 pointer-coarse:my-0 [&>svg]:size-3 [&>svg]:fill-current"
          />
        </ComposerPrimitive.Cancel>
      ) : (
        <ComposerPrimitive.Send asChild>
          <IconButton
            label="Send"
            icon={icons.send}
            side="top"
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground my-1 disabled:opacity-30 pointer-coarse:my-0"
          />
        </ComposerPrimitive.Send>
      )}
    </ComposerPrimitive.Root>
  );
}

/**
 * The thread, in the popover. A widget call is a chip that puts its widget on
 * the stage, never a second frame.
 */
function Transcript() {
  return (
    <ThreadPrimitive.Viewport
      tabIndex={0}
      role="region"
      aria-label="Messages"
      className="gfc-scroll flex max-h-[min(28rem,var(--available-height))] w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-y-auto overscroll-contain p-3 outline-none"
    >
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <p className={cn("text-muted-foreground", text.bodySm)}>
          Messages in this chat are listed here.
        </p>
      </AuiIf>
      <ThreadPrimitive.Messages>{renderTranscript}</ThreadPrimitive.Messages>
    </ThreadPrimitive.Viewport>
  );
}

const renderTranscript = () => <TranscriptMessage />;

function TranscriptMessage() {
  const role = useAuiState((s) => s.message.role);

  if (role === "user")
    return (
      <MessagePrimitive.Root className="flex justify-end">
        <div
          className={cn(
            field,
            radius.lg,
            "max-w-[85%] px-3 py-1.5 wrap-break-word whitespace-pre-wrap",
            text.body,
          )}
        >
          <MessagePrimitive.Parts>
            {({ part }) => (part.type === "text" ? part.text : null)}
          </MessagePrimitive.Parts>
        </div>
      </MessagePrimitive.Root>
    );

  return (
    <MessagePrimitive.Root className="flex min-w-0 flex-col gap-2">
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text") return part.text ? <MarkdownText /> : <></>;
          if (isWidgetPart(part))
            return <TranscriptWidget toolCallId={part.toolCallId} />;
          return <></>;
        }}
      </MessagePrimitive.Parts>
    </MessagePrimitive.Root>
  );
}

function TranscriptWidget({ toolCallId }: { toolCallId: string }) {
  const { shownId, show } = useContext(StageContext);
  const call = useWidgetCall(toolCallId);
  const widgets = useWidgets();
  if (!call) return null;
  if (isStoppedEdit(call)) return <WidgetStatusLine toolCallId={toolCallId} />;

  const entry = widgets.find((item) =>
    item.calls.some((other) => other.toolCallId === toolCallId),
  );
  if (!entry) return <WidgetChip toolCallId={toolCallId} />;
  const replaced = call.status === "ready" && !call.current;

  return (
    <WidgetChip
      toolCallId={toolCallId}
      onOpen={() => show(entry.id)}
      active={entry.id === shownId && !replaced}
      label={`${call.label}, ${widgetStatusText(call).toLowerCase()}. Show ${
        replaced ? "the newest version" : "it"
      } on the stage`}
    />
  );
}
