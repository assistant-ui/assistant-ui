"use client";

import {
  AuiIf,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import {
  ChatList,
  Composer,
  CopyButton,
  field,
  focusBorder,
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
  MenuSeparator,
  MenuTrigger,
  paper,
  Popover,
  PopoverContent,
  PopoverTrigger,
  radius,
  text,
  Tooltip,
  variantRoot,
  weight,
  type Glyph,
} from "../components/ui";
import {
  isStoppedEdit,
  isWidgetPart,
  lower,
  SUGGESTIONS,
  useAskForChange,
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
  WidgetFrame,
  widgetMeta,
  WidgetStatusLine,
  type WidgetCall,
} from "../lib/widgets";

const gutter = "grid grid-cols-1 gap-x-3 @xl:grid-cols-[2.5rem_minmax(0,1fr)]";

const numberClass =
  "text-muted-foreground font-mono text-xs leading-4 tabular-nums select-none";

const promptRowClass = cn(listRowClass, "h-8 gap-2.5 pointer-coarse:h-10");

const isBusy = (message: ThreadMessage | undefined) =>
  message?.status?.type === "running" ||
  message?.status?.type === "requires-action";

const textOf = (message: ThreadMessage | undefined, joiner = " ") =>
  (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join(joiner)
    .trim();

export function NotebookVariant() {
  const viewport = useRef<HTMLDivElement>(null);

  return (
    <ThreadPrimitive.Root
      data-variant="notebook"
      className={cn(variantRoot, "@container flex-col")}
    >
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ThreadPrimitive.Viewport
          ref={viewport}
          data-nb-viewport
          className="gfc-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-4"
        >
          <div className="mx-auto flex w-full max-w-205 flex-col pt-6">
            <AuiIf condition={(s) => s.thread.isEmpty}>
              <Welcome />
            </AuiIf>
            <div className="flex flex-col gap-8 pb-8 empty:hidden">
              <ThreadPrimitive.Messages>
                {renderMessage}
              </ThreadPrimitive.Messages>
            </div>
            <ThreadPrimitive.ViewportFooter
              data-nb-composer
              className="bg-background sticky bottom-0 z-10 flex flex-col pb-3"
            >
              <div
                aria-hidden
                className="from-background pointer-events-none absolute inset-x-0 -top-6 h-6 bg-linear-to-t to-transparent"
              />
              <ThreadPrimitive.ScrollToBottom asChild>
                <IconButton
                  label="Scroll to the last cell"
                  icon={icons.arrowDown}
                  side="top"
                  className={cn(
                    paper,
                    "hover:bg-accent absolute -top-10 self-center shadow-(--float-shadow) disabled:invisible",
                  )}
                />
              </ThreadPrimitive.ScrollToBottom>
              <ComposerCell />
            </ThreadPrimitive.ViewportFooter>
            <AuiIf condition={(s) => s.thread.isEmpty}>
              <PromptList label="Start with" items={starters} />
            </AuiIf>
            <NextSteps />
          </div>
        </ThreadPrimitive.Viewport>
        <Outline viewport={viewport} />
      </div>
    </ThreadPrimitive.Root>
  );
}

function TopBar() {
  const [open, setOpen] = useState(false);
  const title = useAuiState((s) => s.threadListItem.title) ?? "Untitled";
  const newChat = useNewChat();

  return (
    <div
      className={cn(
        hairline,
        "flex h-11 shrink-0 items-center gap-1 border-b px-2 pointer-coarse:h-12",
      )}
    >
      <h1 className="flex min-w-0 font-sans tracking-normal">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<TitleButton label={title} />} />
          <PopoverContent aria-label="Chats">
            <ChatList
              onPick={() => setOpen(false)}
              className="gfc-scroll max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain p-1"
            />
          </PopoverContent>
        </Popover>
      </h1>
      <span className="min-w-0 flex-1" />
      <IconButton label="New chat" icon={icons.newChat} onClick={newChat} />
    </div>
  );
}

function TitleButton({
  label,
  className,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <Tooltip label="Chats">
      <button
        type="button"
        aria-label={`${label}, chats`}
        className={cn(
          "hover:bg-accent data-popup-open:bg-accent flex h-7 min-w-0 items-center gap-1 rounded-full ps-2.5 pe-1.5 transition-colors motion-reduce:transition-none pointer-coarse:h-9",
          text.body,
          weight.strong,
          focusBorder,
          className,
        )}
        {...props}
      >
        <span className="truncate">{label}</span>
        <Icon
          {...icons.chevronDown}
          className="text-muted-foreground size-3.5"
        />
      </button>
    </Tooltip>
  );
}

function Welcome() {
  return (
    <div className={cn(gutter, "pt-4 pb-8 @xl:pt-10")}>
      <div className="flex min-w-0 flex-col gap-1.5 @xl:col-start-2">
        <h2 className={cn("font-sans", text.title, weight.heading)}>
          {WELCOME.title}
        </h2>
        <p className="text-muted-foreground">
          Ask in the cell below. The reply is drawn under your prompt, as text
          or as a live widget.
        </p>
      </div>
    </div>
  );
}

function ComposerCell() {
  const number = useAuiState(
    (s) =>
      s.thread.messages.filter((message) => message.role === "user").length + 1,
  );

  return (
    <div className={cn(gutter, "gap-y-1")}>
      <span aria-hidden className={cn(numberClass, "@xl:pt-5")}>
        [{number}]
      </span>
      <Composer>
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
  );
}

type PromptItem = { prompt: string; label: string; icon: Glyph };

const starters: readonly PromptItem[] = SUGGESTIONS.map((entry) => ({
  prompt: entry.prompt,
  label: entry.label,
  icon: glyphFor(entry.icon),
}));

function PromptList({
  label,
  items,
}: {
  label: string;
  items: readonly PromptItem[];
}) {
  const id = useId();

  return (
    <div className={cn(gutter, "pb-3")}>
      <div
        role="group"
        aria-labelledby={id}
        className="-mx-2 flex min-w-0 flex-col gap-px @xl:col-start-2"
      >
        <MenuLabel id={id}>{label}</MenuLabel>
        {items.map((item) => (
          <ThreadPrimitive.Suggestion
            key={item.prompt}
            prompt={item.prompt}
            send
            onClick={focusComposer}
            className={promptRowClass}
          >
            <Icon {...item.icon} className="size-3.5" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

function NextSteps() {
  const followUps = useFollowUps();
  const widgets = useWidgets();
  if (followUps.length === 0) return null;

  const items = followUps.map((prompt) => {
    const starter = starters.find((entry) => entry.prompt === prompt);
    const change = widgets.some((entry) =>
      widgetMeta(entry.title).changes.includes(prompt),
    );
    return {
      prompt,
      label: prompt,
      icon: starter?.icon ?? (change ? icons.edit : icons.chat),
    };
  });
  return <PromptList label="Next" items={items} />;
}

const renderMessage = () => <Message />;

function Message() {
  // A prompt and its reply are one cell, drawn in the reply's place. A prompt
  // draws the cell itself only while it has no reply.
  const draws = useAuiState(
    (s) =>
      s.message.role === "assistant" ||
      (s.message.role === "user" &&
        s.thread.messages[s.message.index + 1]?.role !== "assistant"),
  );
  return draws ? <Cell /> : null;
}

function Cell() {
  const id = useAuiState((s) => s.message.id);
  const answered = useAuiState((s) => s.message.role === "assistant");
  const busy = useAuiState((s) => isBusy(s.message));
  const number = useAuiState(
    (s) =>
      s.thread.messages
        .slice(0, s.message.index + 1)
        .filter((message) => message.role === "user").length || 1,
  );
  const prompt = useAuiState((s) => {
    const asked =
      s.message.role === "user"
        ? s.message
        : s.thread.messages[s.message.index - 1];
    return asked?.role === "user" ? textOf(asked) : "";
  });
  const call = useWidgetCalls().findLast((entry) => entry.messageId === id);
  const [showCode, setShowCode] = useState(false);
  const heading = useId();

  return (
    <MessagePrimitive.Root asChild>
      <article
        tabIndex={-1}
        data-nb-cell={id}
        aria-labelledby={heading}
        className="group/cell grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 outline-none @xl:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
      >
        <span
          aria-hidden
          className={cn(
            numberClass,
            "group-focus-visible/cell:text-foreground col-start-1 row-start-1 flex h-7 items-center pointer-coarse:h-9",
          )}
        >
          [{number}]
        </span>
        <h2
          id={heading}
          className={cn(
            "col-span-2 row-start-2 min-w-0 py-0.5 font-sans text-[0.9375rem] leading-6 tracking-normal wrap-break-word whitespace-pre-wrap @xl:col-[2] @xl:row-start-1 pointer-coarse:@xl:py-1.5",
            weight.strong,
          )}
        >
          <span className="sr-only">Cell {number}: </span>
          {prompt}
        </h2>
        <div className="col-start-2 row-start-1 flex h-7 items-center justify-end opacity-0 transition-opacity duration-150 group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100 group-has-[:focus-visible]/cell:opacity-100 has-[[aria-expanded=true]]:opacity-100 motion-reduce:transition-none @xl:col-start-3 @xl:min-w-22 pointer-coarse:h-9 pointer-coarse:opacity-100 pointer-coarse:@xl:min-w-28">
          {answered && !busy && (
            <CellTools
              call={call}
              showCode={showCode}
              onToggleCode={() => setShowCode((value) => !value)}
            />
          )}
        </div>
        {answered && (
          <div className="col-span-2 row-start-3 flex min-w-0 flex-col gap-3 @xl:col-[2/-1] @xl:row-start-2">
            <AuiIf
              condition={(s) =>
                s.message.status?.type === "running" &&
                s.message.content.length === 0
              }
            >
              <p
                role="status"
                className={cn("text-muted-foreground", text.bodySm)}
              >
                <span className="shimmer motion-reduce:animate-none">
                  Thinking
                </span>
              </p>
            </AuiIf>
            <AuiIf
              condition={(s) =>
                s.message.status?.type === "incomplete" &&
                s.message.status.reason === "cancelled" &&
                s.message.content.length === 0
              }
            >
              <p className={cn("text-muted-foreground", text.bodySm)}>
                Stopped before anything was written.
              </p>
            </AuiIf>
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === "text")
                  return part.text ? <MarkdownText /> : <></>;
                if (isWidgetPart(part))
                  return (
                    <CellWidget
                      toolCallId={part.toolCallId}
                      showCode={
                        showCode && part.toolCallId === call?.toolCallId
                      }
                    >
                      {part.toolUI}
                    </CellWidget>
                  );
                return <></>;
              }}
            </MessagePrimitive.Parts>
          </div>
        )}
      </article>
    </MessagePrimitive.Root>
  );
}

function CellTools({
  call,
  showCode,
  onToggleCode,
}: {
  call: WidgetCall | undefined;
  showCode: boolean;
  onToggleCode: () => void;
}) {
  const reply = useAuiState((s) => textOf(s.message, "\n\n"));
  const widget = call?.status === "ready" ? call : undefined;
  if (!reply && !widget) return null;

  return (
    <div
      role="group"
      aria-label="Cell actions"
      className="flex items-center gap-0.5"
    >
      {reply ? (
        <CopyButton text={reply} label="Copy the reply" side="top" />
      ) : null}
      {widget && (
        <IconButton
          label={showCode ? "Hide the code" : "Show the code"}
          icon={icons.code}
          side="top"
          aria-expanded={showCode}
          className="aria-expanded:bg-accent aria-expanded:text-foreground"
          onClick={onToggleCode}
        />
      )}
      {widget?.current && <ChangeMenu call={widget} />}
    </div>
  );
}

function ChangeMenu({ call }: { call: WidgetCall }) {
  const changes = useOpenChanges(call.title);
  const running = useAuiState((s) => s.thread.isRunning);
  const send = useSendPrompt();
  const askForChange = useAskForChange();
  if (changes.length === 0) return null;

  return (
    <Menu>
      <MenuTrigger
        render={
          <IconButton
            label={`Change the ${lower(call.label)}`}
            icon={icons.edit}
            side="top"
          />
        }
      />
      <MenuContent align="end">
        {changes.map((prompt) => (
          <MenuItem
            key={prompt}
            disabled={running}
            onClick={() => {
              send(prompt);
              // This cell's Change button goes once the edit lands in a new
              // cell, so the focus moves on to the composer.
              focusComposer();
            }}
          >
            {prompt}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onClick={() => askForChange(call.title)}>
          Describe another change
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function CellWidget({
  toolCallId,
  showCode,
  children,
}: {
  toolCallId: string;
  showCode: boolean;
  children: ReactNode;
}) {
  const call = useWidgetCall(toolCallId);
  const widgets = useWidgets();
  if (!call) return null;
  if (isStoppedEdit(call)) return <WidgetStatusLine toolCallId={toolCallId} />;

  if (call.status === "ready" && !call.current) {
    const latest = widgets.find((entry) => entry.title === call.title)?.call;
    return (
      <>
        <WidgetChip
          toolCallId={toolCallId}
          onOpen={(event) =>
            revealCell(
              event.currentTarget.closest("[data-nb-viewport]"),
              latest?.messageId,
            )
          }
          label={`${call.label}, earlier version. Go to the newest version`}
        />
        {showCode && <Source toolCallId={toolCallId} />}
      </>
    );
  }

  return (
    <section aria-label={call.label} className="flex min-w-0 flex-col gap-2">
      <WidgetStatusLine toolCallId={toolCallId} />
      <WidgetFrame>{children}</WidgetFrame>
      {showCode && <Source toolCallId={toolCallId} />}
    </section>
  );
}

function Source({ toolCallId }: { toolCallId: string }) {
  const code = useWidgetCode(toolCallId);

  return (
    <div className={cn(field, radius.sm, "relative")}>
      <WidgetCode id={toolCallId} className="max-h-72 p-3 pe-10" />
      <CopyButton
        text={code ?? ""}
        label="Copy the code"
        side="left"
        className="absolute end-1.5 top-1.5"
      />
    </div>
  );
}

type CellInfo = {
  id: string;
  number: number;
  prompt: string;
  running: boolean;
};

function useCells(): readonly CellInfo[] {
  const list = useAuiState((s) => {
    const cells: CellInfo[] = [];
    s.thread.messages.forEach((message, index, messages) => {
      if (message.role !== "user") return;
      const next = messages[index + 1];
      const reply = next?.role === "assistant" ? next : undefined;
      cells.push({
        id: (reply ?? message).id,
        number: cells.length + 1,
        prompt: textOf(message),
        running: isBusy(reply),
      });
    });
    return JSON.stringify(cells);
  });
  return useMemo(() => JSON.parse(list) as CellInfo[], [list]);
}

const cellId = (cell: Element) => cell.getAttribute("data-nb-cell");

function revealCell(viewport: Element | null, id: string | undefined) {
  const cell = [
    ...(viewport?.querySelectorAll<HTMLElement>("[data-nb-cell]") ?? []),
  ].find((entry) => cellId(entry) === id);
  if (!viewport || !cell) return;

  viewport.scrollTo({
    top:
      viewport.scrollTop +
      cell.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      16,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
  cell.focus({ preventScroll: true });
}

/**
 * The cell to mark in the outline: the one last picked there while its first
 * line is on screen, else the first that starts in the upper half of the
 * viewport, else the one that runs through its top edge.
 */
function cellInView(viewport: HTMLElement, picked: string | null) {
  const { top, bottom } = viewport.getBoundingClientRect();
  const floor =
    viewport.querySelector("[data-nb-composer]")?.getBoundingClientRect().top ??
    bottom;
  const cells = [...viewport.querySelectorAll("[data-nb-cell]")];
  const startsAbove = (cell: Element, line: number) => {
    const start = cell.getBoundingClientRect().top;
    return start >= top - 1 && start < line;
  };
  const cell =
    cells.find(
      (entry) => cellId(entry) === picked && startsAbove(entry, floor),
    ) ??
    cells.find((entry) => startsAbove(entry, (top + floor) / 2)) ??
    cells.findLast((entry) => entry.getBoundingClientRect().top < top) ??
    cells[0];
  return cell ? cellId(cell) : null;
}

function useCellInView(viewport: RefObject<HTMLDivElement | null>) {
  const [inView, setInView] = useState<string | null>(null);
  const picked = useRef<string | null>(null);

  const read = useCallback(() => {
    if (viewport.current)
      setInView(cellInView(viewport.current, picked.current));
  }, [viewport]);

  useEffect(() => {
    const scroller = viewport.current;
    const content = scroller?.firstElementChild;
    if (!scroller || !content) return;

    let frame = 0;
    const schedule = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    observer.observe(content);
    scroller.addEventListener("scroll", schedule, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [viewport, read]);

  const jump = useCallback(
    (id: string) => {
      picked.current = id;
      revealCell(viewport.current, id);
      read();
    },
    [viewport, read],
  );

  return [inView, jump] as const;
}

function Outline({ viewport }: { viewport: RefObject<HTMLDivElement | null> }) {
  const cells = useCells();
  const calls = useWidgetCalls();
  const [inView, jump] = useCellInView(viewport);

  return (
    <nav
      aria-label="Outline"
      className={cn(
        hairline,
        "gfc-scroll hidden w-60 shrink-0 flex-col gap-px overflow-y-auto border-s p-2 @[68.75rem]:flex",
      )}
    >
      <MenuLabel>Outline</MenuLabel>
      {cells.length === 0 && (
        <p className={cn("text-muted-foreground px-2 py-1.5", text.bodySm)}>
          Cells are listed here as you run them.
        </p>
      )}
      {cells.map((cell) => {
        const call = calls.findLast((entry) => entry.messageId === cell.id);
        const current = cell.id === inView;
        return (
          <button
            key={cell.id}
            type="button"
            data-active={current ? "" : undefined}
            aria-current={current ? "location" : undefined}
            onClick={() => jump(cell.id)}
            className={listRowClass}
          >
            <span aria-hidden className={cn(numberClass, "min-w-6 shrink-0")}>
              [{cell.number}]
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span className="sr-only">Cell {cell.number}: </span>
              {cell.prompt}
            </span>
            {cell.running ? (
              <LiveDot />
            ) : call ? (
              <Icon {...glyphFor(call.icon)} className="size-3.5" />
            ) : null}
            {call && <span className="sr-only">, {call.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
