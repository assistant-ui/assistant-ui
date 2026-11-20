"use client";

import {
  ActionBarPrimitive,
  AssistantModalPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import {
  ArrowDown02Icon,
  BubbleChatAddIcon,
  DragDropHorizontalIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import {
  ArrowDownIcon,
  GripHorizontalIcon,
  RefreshCwIcon,
  SquarePenIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import data from "../data.json";
import {
  UPDATE_COMMENTS_TOOL,
  UPDATE_DOCUMENT_TOOL,
  useDocumentStore,
} from "../lib/document";
import {
  denseGlass,
  field,
  floating,
  Icon,
  IconButton,
  iconButtonClass,
  icons,
  menuRowClass,
  paper,
  radius,
  text,
  Tooltip,
  weight,
  type Glyph,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* Icons this file adds, and the lines a tool call shows.                     */
/* -------------------------------------------------------------------------- */

const newChatIcon: Glyph = { huge: BubbleChatAddIcon, lucide: SquarePenIcon };
const moveIcon: Glyph = {
  huge: DragDropHorizontalIcon,
  lucide: GripHorizontalIcon,
};
const retryIcon: Glyph = { huge: RefreshIcon, lucide: RefreshCwIcon };
const scrollDownIcon: Glyph = { huge: ArrowDown02Icon, lucide: ArrowDownIcon };

type ToolLine = { icon: Glyph; running: string; done: string; stopped: string };

const TOOL_LINES: Record<string, ToolLine> = {
  [UPDATE_DOCUMENT_TOOL]: {
    icon: icons.rename,
    running: "Editing the page",
    done: "Edited the page",
    stopped: "Stopped editing the page",
  },
  [UPDATE_COMMENTS_TOOL]: {
    icon: icons.comment,
    running: "Leaving a comment",
    done: "Left a comment",
    stopped: "Stopped before leaving a comment",
  },
};

const SUGGESTION_ICONS = [
  { glyph: icons.check, tint: "green" },
  { glyph: icons.add, tint: "blue" },
  { glyph: icons.text, tint: "amber" },
] as const;

const quiet = `text-muted-foreground flex items-center gap-2 ${text.bodySm}`;

const primaryButton =
  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground disabled:opacity-30";

const markdown =
  "flex flex-col gap-2 wrap-break-word [&_a]:underline [&_a]:underline-offset-2 [&_code]:bg-foreground/6 [&_code]:rounded-[6px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_li]:ps-0.5 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:ps-5 [&_strong]:font-(--weight-strong) [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:ps-5 [&_li]:marker:text-muted-foreground";

/* -------------------------------------------------------------------------- */
/* Moving the bar: drag the grip, or use the arrow keys on it.                */
/* -------------------------------------------------------------------------- */

type Offset = { x: number; y: number };

const HOME: Offset = { x: 0, y: 0 };
const EDGE = 8;
const STEP = 24;

const between = (value: number, min: number, max: number) =>
  min > max ? 0 : Math.min(Math.max(value, min), max);

function useMovable(bar: RefObject<HTMLDivElement | null>) {
  const [offset, setOffset] = useState(HOME);
  const current = useRef(HOME);
  const drag = useRef<{ pointer: Offset; from: Offset } | null>(null);

  const moveTo = useCallback(
    (next: Offset) => {
      const element = bar.current;
      const frame = element?.parentElement?.parentElement;
      if (!element || !frame) return;
      const box = element.getBoundingClientRect();
      const bounds = frame.getBoundingClientRect();
      const { x, y } = current.current;
      const placed = {
        x: between(
          next.x,
          bounds.left + EDGE - (box.left - x),
          bounds.right - EDGE - (box.right - x),
        ),
        y: between(next.y, bounds.top + EDGE - (box.top - y), 0),
      };
      if (placed.x === x && placed.y === y) return;
      current.current = placed;
      setOffset(placed);
    },
    [bar],
  );

  // The bar grows upward with the thread, and the frame can shrink.
  useEffect(() => {
    const element = bar.current;
    const frame = element?.parentElement?.parentElement;
    if (!element || !frame) return;
    const observer = new ResizeObserver(() => moveTo(current.current));
    observer.observe(element);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [bar, moveTo]);

  const grip = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        pointer: { x: event.clientX, y: event.clientY },
        from: current.current,
      };
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const start = drag.current;
      if (!start) return;
      moveTo({
        x: start.from.x + event.clientX - start.pointer.x,
        y: start.from.y + event.clientY - start.pointer.y,
      });
    },
    onPointerUp() {
      drag.current = null;
    },
    onPointerCancel() {
      drag.current = null;
    },
    onDoubleClick() {
      moveTo(HOME);
    },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      const { x, y } = current.current;
      const steps: Record<string, Offset> = {
        ArrowLeft: { x: x - STEP, y },
        ArrowRight: { x: x + STEP, y },
        ArrowUp: { x, y: y - STEP },
        ArrowDown: { x, y: y + STEP },
        Home: HOME,
      };
      const next = steps[event.key];
      if (!next) return;
      event.preventDefault();
      moveTo(next);
    },
  };

  return { offset, grip };
}

/* -------------------------------------------------------------------------- */
/* The bar.                                                                   */
/* -------------------------------------------------------------------------- */

type ComposerInput = RefObject<HTMLTextAreaElement | null>;

/**
 * For a control that unmounts on its own click: the focus it holds goes to the
 * composer, where it would otherwise fall to the page.
 */
const handFocusTo = (input: ComposerInput, event: MouseEvent<HTMLElement>) => {
  if (event.currentTarget.contains(document.activeElement))
    input.current?.focus();
};

/**
 * The assistant bar at the bottom centre of the page: a header and a
 * composer that are always there, and the thread, which opens between them.
 */
export function AssistantModal() {
  const [open, setOpen] = useState(true);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const opened = useRef(false);
  const focusLeftInThread = useRef(false);
  const { offset, grip } = useMovable(bar);

  const requests = useDocumentStore((state) => state.assistantRequests);
  const answered = useRef(requests);
  useEffect(() => {
    if (requests === answered.current) return;
    answered.current = requests;
    setOpen(true);
    // The editor takes the focus back once its own update has finished.
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [requests]);

  return (
    <AssistantModalPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        focusLeftInThread.current =
          !next && Boolean(slot?.contains(document.activeElement));
        setOpen(next);
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:pb-5">
        <AssistantModalPrimitive.Anchor
          ref={bar}
          role="region"
          aria-label="Assistant"
          data-assistant-bar
          style={{ translate: `${offset.x}px ${offset.y}px` }}
          className={cn(
            floating,
            text.body,
            "text-popover-foreground pointer-events-auto flex w-full max-w-[600px] flex-col rounded-[calc(var(--radius)+10px)] p-1.5",
            denseGlass,
          )}
        >
          <Header open={open} grip={grip} input={input} />
          {/* The thread is laid out in the bar, not placed over the page. */}
          <div
            ref={setSlot}
            className="[&>[data-radix-popper-content-wrapper]]:static! [&>[data-radix-popper-content-wrapper]]:min-w-0! [&>[data-radix-popper-content-wrapper]]:transform-none!"
          />
          {slot && (
            <AssistantModalPrimitive.Content
              portalProps={{ container: slot }}
              aria-label="Chat with the assistant"
              className="outline-none"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                if (opened.current) input.current?.focus();
                opened.current = true;
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                if (focusLeftInThread.current) input.current?.focus();
              }}
              onEscapeKeyDown={(event) => {
                if (!bar.current?.contains(document.activeElement))
                  event.preventDefault();
              }}
            >
              <Thread input={input} />
            </AssistantModalPrimitive.Content>
          )}
          <Composer input={input} />
        </AssistantModalPrimitive.Anchor>
      </div>
    </AssistantModalPrimitive.Root>
  );
}

function Header({
  open,
  grip,
  input,
}: {
  open: boolean;
  grip: ReturnType<typeof useMovable>["grip"];
  input: ComposerInput;
}) {
  const aui = useAui();
  const empty = useAuiState((s) => s.thread.isEmpty);
  const running = useAuiState((s) => s.thread.isRunning);
  const title = useAuiState((s) => {
    const first = s.thread.messages.find((message) => message.role === "user");
    const part = first?.content.find((entry) => entry.type === "text");
    return part?.type === "text" ? part.text.trim() : "";
  });

  return (
    <div className="flex h-8 items-center gap-0.5 pb-1">
      <AssistantModalPrimitive.Trigger asChild>
        <IconButton
          label={open ? "Minimise" : "Open the chat"}
          icon={icons.chevronDown}
          side="top"
          className={open ? "" : "rotate-180"}
        />
      </AssistantModalPrimitive.Trigger>
      <span className={cn("min-w-0 flex-1 truncate px-1", weight.label)}>
        {title ? title.slice(0, 60) : "New chat"}
      </span>
      {!empty && (
        <IconButton
          label="New chat"
          icon={newChatIcon}
          side="top"
          disabled={running}
          onClick={(event) => {
            handFocusTo(input, event);
            aui.threads().switchToNewThread();
          }}
        />
      )}
      <Tooltip label="Drag to move" side="top">
        <button
          type="button"
          aria-label="Move the assistant. Arrow keys move it, Home puts it back."
          className={cn(
            iconButtonClass,
            "cursor-grab touch-none active:scale-100 active:cursor-grabbing max-sm:hidden",
          )}
          {...grip}
        >
          <Icon {...moveIcon} />
        </button>
      </Tooltip>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Thread.                                                                    */
/* -------------------------------------------------------------------------- */

function Thread({ input }: { input: ComposerInput }) {
  return (
    <ThreadPrimitive.Root className="flex flex-col">
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <SuggestionList input={input} />
      </AuiIf>
      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <ThreadPrimitive.Viewport className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto overscroll-contain px-2 pt-2">
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 flex h-2 shrink-0 justify-center">
            <ThreadPrimitive.ScrollToBottom asChild>
              <IconButton
                label="Scroll to the newest message"
                icon={scrollDownIcon}
                side="top"
                className={cn(
                  paper,
                  "hover:bg-accent absolute bottom-2 shadow-(--float-shadow) disabled:invisible",
                )}
              />
            </ThreadPrimitive.ScrollToBottom>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
}

function SuggestionList({ input }: { input: ComposerInput }) {
  return (
    <div className="flex flex-col pb-1.5">
      <ThreadPrimitive.Suggestions>
        {({ suggestion }) => {
          const index = data.assistant.suggestions.indexOf(suggestion.prompt);
          const look = SUGGESTION_ICONS[index];
          return (
            <SuggestionPrimitive.Trigger
              send
              onClick={(event) => handFocusTo(input, event)}
              className={cn(
                menuRowClass,
                "hover:bg-accent focus-visible:bg-accent h-8 cursor-pointer px-2.5 transition-colors motion-reduce:transition-none",
              )}
            >
              {look && (
                <span data-tint={look.tint} className="flex">
                  <Icon {...look.glyph} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">
                <SuggestionPrimitive.Title />
              </span>
            </SuggestionPrimitive.Trigger>
          );
        }}
      </ThreadPrimitive.Suggestions>
    </div>
  );
}

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
          "max-w-[85%] px-3 py-2 wrap-break-word whitespace-pre-wrap",
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
  const last = useAuiState((s) => s.message.isLast);

  return (
    <MessagePrimitive.Root className="group relative flex flex-col gap-1.5 px-1">
      <AuiIf
        condition={(s) =>
          s.message.status?.type === "running" && s.message.content.length === 0
        }
      >
        <p role="status" className={quiet}>
          <span className="shimmer motion-reduce:animate-none">Thinking</span>
        </p>
      </AuiIf>
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text")
            return <MarkdownTextPrimitive className={markdown} />;
          if (part.type === "tool-call")
            return (
              <ToolCallLine
                toolName={part.toolName}
                state={
                  wasRejected(part.result) ? "incomplete" : part.status.type
                }
              />
            );
          return null;
        }}
      </MessagePrimitive.Parts>
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root
          className={cn(
            radius.sm,
            text.bodySm,
            "text-destructive bg-(--destructive-subtle) px-3 py-2",
          )}
        >
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
      <ActionBarPrimitive.Root
        hideWhenRunning
        className={cn(
          "-ms-1.5 flex gap-0.5 transition-opacity duration-150 motion-reduce:transition-none",
          last
            ? ""
            : "absolute start-1 top-full opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
        )}
      >
        <CopyButton />
        <ActionBarPrimitive.Reload asChild>
          <IconButton label="Retry" icon={retryIcon} side="bottom" />
        </ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function CopyButton() {
  const copied = useAuiState((s) => s.message.isCopied);

  return (
    <ActionBarPrimitive.Copy asChild>
      <IconButton
        label={copied ? "Copied" : "Copy"}
        icon={copied ? icons.tick : icons.duplicate}
        side="bottom"
      />
    </ActionBarPrimitive.Copy>
  );
}

/** An interactable tool answers `success: false` for a page that was left. */
const wasRejected = (result: unknown) =>
  typeof result === "object" &&
  result !== null &&
  "success" in result &&
  result.success === false;

function ToolCallLine({
  toolName,
  state,
}: {
  toolName: string;
  state: string;
}) {
  const line = TOOL_LINES[toolName] ?? {
    icon: icons.assistant,
    running: `Using ${toolName}`,
    done: `Used ${toolName}`,
    stopped: `Stopped using ${toolName}`,
  };
  const running = state === "running";
  const stopped = state === "incomplete";

  return (
    <p className={quiet}>
      <Icon
        {...(running || stopped ? line.icon : icons.tick)}
        className="size-3.5"
      />
      <span className={running ? "shimmer motion-reduce:animate-none" : ""}>
        {running ? line.running : stopped ? line.stopped : line.done}
      </span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer.                                                                  */
/* -------------------------------------------------------------------------- */

function Composer({ input }: { input: ComposerInput }) {
  const running = useAuiState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root
      className={cn(
        field,
        radius.xl,
        "has-[textarea:focus-visible]:border-ring flex items-end gap-1 border border-transparent py-1 ps-3 pe-1 transition-colors motion-reduce:transition-none",
      )}
    >
      <ComposerPrimitive.Input
        ref={input}
        rows={1}
        placeholder={running ? "Working" : "Ask the assistant"}
        aria-label="Message the assistant"
        className="placeholder:text-muted-foreground max-h-32 min-h-7 flex-1 resize-none bg-transparent py-1 text-sm leading-5 outline-none pointer-coarse:min-h-9 pointer-coarse:py-2 pointer-coarse:text-base"
      />
      {running ? (
        <ComposerPrimitive.Cancel
          asChild
          onClick={(event) => handFocusTo(input, event)}
        >
          <IconButton
            label="Stop"
            icon={icons.stop}
            side="top"
            className={cn(primaryButton, "[&>svg]:size-3 [&>svg]:fill-current")}
          />
        </ComposerPrimitive.Cancel>
      ) : (
        <ComposerPrimitive.Send
          asChild
          onClick={(event) => handFocusTo(input, event)}
        >
          <IconButton
            label="Send"
            icon={icons.send}
            side="top"
            className={primaryButton}
          />
        </ComposerPrimitive.Send>
      )}
    </ComposerPrimitive.Root>
  );
}
