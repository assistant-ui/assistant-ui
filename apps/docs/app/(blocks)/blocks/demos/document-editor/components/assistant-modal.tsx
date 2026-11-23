"use client";

import {
  ActionBarPrimitive,
  AssistantModalPrimitive,
  AttachmentPrimitive,
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
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import data from "../data.json";
import {
  documentActions,
  EDIT_MODES,
  FOLLOW_UPS,
  PROFILE,
  UPDATE_COMMENTS_TOOL,
  UPDATE_DOCUMENT_TOOL,
  useDocumentStore,
  type EditMode,
} from "../lib/document";
import { ThreadList } from "./thread-list";
import {
  Avatar,
  Badge,
  chipClass,
  denseGlass,
  field,
  floating,
  Icon,
  IconButton,
  iconButtonClass,
  icons,
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  menuRowClass,
  MenuTrigger,
  paper,
  Popover,
  PopoverContent,
  PopoverTrigger,
  radius,
  text,
  textButtonClass,
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

/** The marks of the suggestions an empty chat offers, in their order in data.json. */
const SUGGESTION_ICONS = [
  { glyph: icons.check, tint: "green" },
  { glyph: icons.add, tint: "blue" },
  { glyph: icons.table, tint: "amber" },
  { glyph: icons.comment, tint: "rose" },
] as const;

const EDIT_MODE_COPY: Record<
  EditMode,
  { label: string; icon: Glyph; description: string }
> = {
  auto: {
    label: "Auto",
    icon: icons.auto,
    description: "Edits land on the page as they are written.",
  },
  manual: {
    label: "Manual",
    icon: icons.manual,
    description: "Each edit waits for you to accept or undo it.",
  },
};

const quiet = `text-muted-foreground flex items-center gap-2 ${text.bodySm}`;

const primaryButton =
  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground disabled:opacity-30";

const markdown =
  "flex flex-col gap-2 wrap-break-word [&_a]:underline [&_a]:underline-offset-2 [&_code]:bg-foreground/6 [&_code]:rounded-[6px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_li]:ps-0.5 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:ps-5 [&_strong]:font-(--weight-strong) [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:ps-5 [&_li]:marker:text-muted-foreground";

const quoted = `text-muted-foreground border-border border-s-2 ps-2 ${text.bodySm}`;

/* -------------------------------------------------------------------------- */
/* The bar's size, kept for the visit in sessionStorage.                      */
/* -------------------------------------------------------------------------- */

/** `width` is the bar's; `height` is the thread's. Null leaves it to the layout. */
type Size = { width: number | null; height: number | null };

const AUTO: Size = { width: null, height: null };
const SIZE_KEY = "aui-blocks:document-editor:assistant-size";
const DEFAULT_WIDTH = 600;
const MIN_WIDTH = 360;
const MIN_HEIGHT = 96;
/**
 * What the bar leaves free of the page's height at its tallest: its own gap
 * at the bottom, the pills at the top, and the pill of an edit under review.
 */
const ROOM_AROUND = 128;

const sizeListeners = new Set<() => void>();
let size: Size | undefined;

const lengthOf = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function readSize(): Size {
  if (size) return size;
  let stored: unknown = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(SIZE_KEY) ?? "null");
  } catch {
    // Storage can be blocked. The size then lasts until the page is left.
  }
  const saved = typeof stored === "object" && stored !== null ? stored : {};
  size = {
    width: "width" in saved ? lengthOf(saved.width) : null,
    height: "height" in saved ? lengthOf(saved.height) : null,
  };
  return size;
}

function writeSize(next: Size) {
  size = next;
  try {
    sessionStorage.setItem(SIZE_KEY, JSON.stringify(next));
  } catch {
    // As above.
  }
  for (const listener of sizeListeners) listener();
}

const subscribeToSize = (listener: () => void) => {
  sizeListeners.add(listener);
  return () => {
    sizeListeners.delete(listener);
  };
};

const serverSize = () => AUTO;

/* -------------------------------------------------------------------------- */
/* Moving and resizing the bar: drag the grip, an edge or a corner, or use    */
/* the arrow keys on the grip and on the handle at the top edge.              */
/* -------------------------------------------------------------------------- */

type Offset = { x: number; y: number };

/** Which way a handle pulls: -1 is left or up, 1 is right or down. */
type Handle = { x: -1 | 0 | 1; y: -1 | 0 | 1; className: string };

const HOME: Offset = { x: 0, y: 0 };
/** The bar's height, set on the page frame for the page's bottom padding. */
const BAR_HEIGHT = "--assistant-bar-height";
const EDGE = 8;
const GUTTER = 12;
const STEP = 24;

const TOP: Handle = { x: 0, y: -1, className: "" };

/** The handles a pointer drags. Below `sm` the bar is as wide as the page. */
const HANDLES: readonly Handle[] = [
  { x: 0, y: 1, className: "inset-x-2 -bottom-1 h-2 cursor-ns-resize" },
  { x: -1, y: 0, className: "inset-y-2 -left-1 w-2 cursor-ew-resize" },
  { x: 1, y: 0, className: "inset-y-2 -right-1 w-2 cursor-ew-resize" },
  { x: -1, y: -1, className: "-top-1 -left-1 size-3 cursor-nwse-resize" },
  { x: 1, y: -1, className: "-top-1 -right-1 size-3 cursor-nesw-resize" },
  { x: -1, y: 1, className: "-bottom-1 -left-1 size-3 cursor-nesw-resize" },
  { x: 1, y: 1, className: "-right-1 -bottom-1 size-3 cursor-nwse-resize" },
];

const between = (value: number, min: number, max: number) =>
  min > max ? 0 : Math.min(Math.max(value, min), max);

const lengthBetween = (value: number, min: number, max: number) =>
  Math.round(Math.min(Math.max(value, min), Math.max(min, max)));

type Resize = {
  pointer: Offset;
  from: Offset;
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  /** The widest the bar can be on this page, wherever it sits. */
  pageWidth: number;
};

function useBarGeometry(
  bar: RefObject<HTMLDivElement | null>,
  thread: HTMLDivElement | null,
) {
  const size = useSyncExternalStore(subscribeToSize, readSize, serverSize);
  const [offset, setOffset] = useState(HOME);
  const current = useRef(HOME);
  const drag = useRef<{ pointer: Offset; from: Offset } | null>(null);
  const resize = useRef<Resize | null>(null);
  // How far resizing has moved the bar, which a reset of its size takes back.
  const nudged = useRef(HOME);

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

  // The bar grows upward with the thread, and the frame can shrink. The page
  // is told how tall the bar is, so its end can scroll clear of it.
  useEffect(() => {
    const element = bar.current;
    const frame = element?.parentElement?.parentElement;
    if (!element || !frame) return;
    const observer = new ResizeObserver(() => {
      moveTo(current.current);
      frame.style.setProperty(BAR_HEIGHT, `${element.offsetHeight}px`);
    });
    observer.observe(element);
    observer.observe(frame);
    return () => {
      observer.disconnect();
      frame.style.removeProperty(BAR_HEIGHT);
    };
  }, [bar, moveTo]);

  // How far `handle` can pull from where the bar is now.
  const measure = (handle: Handle, pointer: Offset): Resize | null => {
    const element = bar.current;
    const frame = element?.parentElement?.parentElement;
    if (!element || !frame || !thread) return null;
    const box = element.getBoundingClientRect();
    const bounds = frame.getBoundingClientRect();
    const height = thread.getBoundingClientRect().height;
    const pageWidth = bounds.width - 2 * GUTTER;
    const roomX =
      handle.x > 0
        ? bounds.right - EDGE - box.right
        : box.left - bounds.left - EDGE;
    const roomY =
      handle.y > 0 ? -current.current.y : box.top - bounds.top - EDGE;
    return {
      pointer,
      from: current.current,
      width: box.width,
      height,
      maxWidth: Math.min(box.width + roomX, pageWidth),
      maxHeight:
        height + Math.min(roomY, bounds.height - ROOM_AROUND - box.height),
      pageWidth,
    };
  };

  const goHome = () => {
    nudged.current = HOME;
    moveTo(HOME);
  };

  const resetSize = () => {
    const { x, y } = current.current;
    writeSize(AUTO);
    moveTo({ x: x - nudged.current.x, y: y - nudged.current.y });
    nudged.current = HOME;
  };

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
    onDoubleClick: goHome,
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      const { x, y } = current.current;
      const steps: Record<string, Offset> = {
        ArrowLeft: { x: x - STEP, y },
        ArrowRight: { x: x + STEP, y },
        ArrowUp: { x, y: y - STEP },
        ArrowDown: { x, y: y + STEP },
      };
      const next = steps[event.key];
      if (!next && event.key !== "Home") return;
      event.preventDefault();
      if (next) moveTo(next);
      else goHome();
    },
  };

  /**
   * The pointer handlers of one resize handle. The edge under the pointer
   * follows it and the opposite edge stays where it is.
   */
  const resizer = (handle: Handle) => ({
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      resize.current = measure(handle, { x: event.clientX, y: event.clientY });
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const start = resize.current;
      if (!start) return;
      const saved = readSize();
      const width =
        handle.x === 0
          ? null
          : lengthBetween(
              start.width + handle.x * (event.clientX - start.pointer.x),
              MIN_WIDTH,
              start.maxWidth,
            );
      const height =
        handle.y === 0
          ? null
          : lengthBetween(
              start.height + handle.y * (event.clientY - start.pointer.y),
              MIN_HEIGHT,
              start.maxHeight,
            );
      // The bar is centred and stands on its bottom edge, so half of a new
      // width and all of a height pulled from below are made up by moving it.
      const placed = {
        x:
          start.from.x +
          (width === null ? 0 : (handle.x * (width - start.width)) / 2),
        y:
          start.from.y +
          (height !== null && handle.y > 0 ? height - start.height : 0),
      };
      nudged.current = {
        x: nudged.current.x + placed.x - current.current.x,
        y: nudged.current.y + placed.y - current.current.y,
      };
      current.current = placed;
      setOffset(placed);
      writeSize({
        width: width ?? saved.width,
        height: height ?? saved.height,
      });
    },
    onPointerUp() {
      resize.current = null;
    },
    onPointerCancel() {
      resize.current = null;
    },
    onDoubleClick: resetSize,
  });

  const resizeKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      resetSize();
      return;
    }
    const steps: Record<string, Offset> = {
      ArrowLeft: { x: -STEP, y: 0 },
      ArrowRight: { x: STEP, y: 0 },
      ArrowUp: { x: 0, y: STEP },
      ArrowDown: { x: 0, y: -STEP },
    };
    const step = steps[event.key];
    if (!step) return;
    const start = measure(TOP, HOME);
    if (!start) return;
    event.preventDefault();
    const saved = readSize();
    // Below `sm` the bar is as wide as the page, so only its height changes.
    const wide = window.matchMedia("(min-width: 40rem)").matches;
    writeSize({
      width:
        step.x !== 0 && wide
          ? lengthBetween(start.width + step.x, MIN_WIDTH, start.pageWidth)
          : saved.width,
      height:
        step.y !== 0
          ? lengthBetween(start.height + step.y, MIN_HEIGHT, start.maxHeight)
          : saved.height,
    });
  };

  return { offset, size, grip, resizer, resizeKeys };
}

type Geometry = ReturnType<typeof useBarGeometry>;

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
 * Dictation belongs to the composer of one chat, which stays out of reach
 * once the bar is minimised or shows another chat, so it ends first.
 */
function useStopDictation() {
  const aui = useAui();
  return useCallback(() => {
    if (aui.composer().getState().dictation) aui.composer().stopDictation();
  }, [aui]);
}

/**
 * The assistant. Open, it is a bar at the bottom centre, with a header, the
 * thread and a composer. Minimised, it is a round button at the bottom end.
 */
export function AssistantModal() {
  const aui = useAui();
  const stopDictation = useStopDictation();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  const focusWasInside = useRef(false);
  const geometry = useBarGeometry(bar, slot);
  const { offset, size } = geometry;

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

  // A passage or an edit the next message is about becomes the composer's
  // quote. The quote names its source by message id; the page has none, so
  // the kind of reference and the page id stand in.
  const reference = useDocumentStore((state) => state.assistantReference);
  useEffect(() => {
    if (!reference) return;
    aui.composer().setQuote({
      text: reference.text || "The last edit on this page",
      messageId: `${reference.kind}:${reference.pageId}`,
    });
    documentActions.clearAssistantReference();
  }, [aui, reference]);

  const running = useAuiState((s) => s.thread.isRunning);
  const threadId = useAuiState((s) => s.threads.mainThreadId);
  const latestReply = useAuiState((s) => {
    const last = s.thread.messages.at(-1);
    return last?.role === "assistant" ? last.id : null;
  });

  // Follow-ups belong to the edit they came after, in the chat it was made in.
  useEffect(() => {
    documentActions.clearLastEdit();
  }, [threadId]);
  useEffect(() => {
    if (running) documentActions.clearLastEdit();
  }, [running]);

  const unseen = useDocumentStore((state) => state.assistantUnseen);
  const before = useRef({ running, latestReply });
  useEffect(() => {
    const was = before.current;
    before.current = { running, latestReply };
    if (open) {
      if (unseen) documentActions.markSeen();
      return;
    }
    const finished = was.running && !running;
    const replied = latestReply !== null && latestReply !== was.latestReply;
    if (finished || replied) documentActions.markUnseen();
  }, [latestReply, open, running, unseen]);

  useEffect(() => {
    if (open || !focusWasInside.current) return;
    focusWasInside.current = false;
    launcher.current?.focus();
  }, [open]);

  const style: CSSProperties & Record<"--bar-width", string> = {
    "--bar-width": `${size.width ?? DEFAULT_WIDTH}px`,
    ...(open && {
      translate: `${offset.x}px ${offset.y}px`,
      maxHeight: `calc(100dvh - ${ROOM_AROUND}px)`,
    }),
  };

  return (
    <AssistantModalPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          focusWasInside.current = Boolean(
            bar.current?.contains(document.activeElement),
          );
          stopDictation();
        }
        setOpen(next);
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-40 flex px-3 pb-3 sm:pb-5",
          open ? "justify-center" : "justify-end",
        )}
      >
        <AssistantModalPrimitive.Anchor
          ref={bar}
          role="region"
          aria-label="Assistant"
          data-assistant-bar
          style={style}
          className={cn(
            "pointer-events-auto relative flex flex-col",
            open
              ? [
                  floating,
                  denseGlass,
                  text.body,
                  "text-popover-foreground w-full rounded-[calc(var(--radius)+10px)] p-1.5 sm:max-w-(--bar-width)",
                ]
              : "items-end",
          )}
        >
          {open && <Header grip={geometry.grip} input={input} />}
          {/* The thread is laid out in the bar, not placed over the page. */}
          <div
            ref={setSlot}
            style={
              open && size.height !== null ? { height: size.height } : undefined
            }
            className={cn(
              "flex min-h-0 flex-col [&>[data-radix-popper-content-wrapper]]:static! [&>[data-radix-popper-content-wrapper]]:flex [&>[data-radix-popper-content-wrapper]]:min-h-0 [&>[data-radix-popper-content-wrapper]]:min-w-0! [&>[data-radix-popper-content-wrapper]]:flex-auto [&>[data-radix-popper-content-wrapper]]:transform-none! [&>[data-radix-popper-content-wrapper]]:flex-col",
              size.height === null && "max-h-[60vh]",
            )}
          />
          {slot && (
            <AssistantModalPrimitive.Content
              portalProps={{ container: slot }}
              aria-label="Chat with the assistant"
              className="flex min-h-0 flex-auto flex-col outline-none"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                if (opened.current) input.current?.focus();
                opened.current = true;
              }}
              onCloseAutoFocus={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => {
                // Escape in the composer stops a reply before it minimises.
                if (running || !bar.current?.contains(document.activeElement))
                  event.preventDefault();
              }}
            >
              <Thread input={input} />
            </AssistantModalPrimitive.Content>
          )}
          {open ? (
            <>
              <FollowUps input={input} />
              <Composer input={input} />
              <ResizeHandles geometry={geometry} />
            </>
          ) : (
            <Launcher ref={launcher} unseen={unseen} />
          )}
        </AssistantModalPrimitive.Anchor>
      </div>
    </AssistantModalPrimitive.Root>
  );
}

/** The round button the bar minimises to, with a dot for anything unseen. */
function Launcher({
  ref,
  unseen,
}: {
  ref: RefObject<HTMLButtonElement | null>;
  unseen: boolean;
}) {
  return (
    <Tooltip label="Open the assistant" side="top">
      <AssistantModalPrimitive.Trigger
        ref={ref}
        aria-label={
          unseen
            ? "Open the assistant. There is something new."
            : "Open the assistant"
        }
        className={cn(
          floating,
          denseGlass,
          "focus-visible:border-ring relative flex size-10 items-center justify-center rounded-full transition-[border-color,scale] duration-150 outline-none active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 pointer-coarse:size-11",
        )}
      >
        <Icon {...icons.bot} className="size-5" />
        {unseen && <Badge className="absolute end-0 top-0" />}
      </AssistantModalPrimitive.Trigger>
    </Tooltip>
  );
}

function Header({
  grip,
  input,
}: {
  grip: Geometry["grip"];
  input: ComposerInput;
}) {
  const aui = useAui();
  const stopDictation = useStopDictation();
  const empty = useAuiState((s) => s.thread.isEmpty);
  const running = useAuiState((s) => s.thread.isRunning);
  const named = useAuiState((s) => s.threadListItem.title);
  const asked = useAuiState((s) => {
    const first = s.thread.messages.find((message) => message.role === "user");
    const part = first?.content.find((entry) => entry.type === "text");
    return part?.type === "text" ? part.text.trim() : "";
  });
  const title = named || asked;

  return (
    <div className="flex min-h-8 shrink-0 items-center gap-0.5 pb-1">
      <AssistantModalPrimitive.Trigger asChild>
        <IconButton label="Minimise" icon={icons.chevronDown} side="top" />
      </AssistantModalPrimitive.Trigger>
      <span className={cn("min-w-0 flex-1 truncate px-1", weight.label)}>
        {title ? title.slice(0, 60) : "New chat"}
      </span>
      <History input={input} disabled={running} />
      {!empty && (
        <IconButton
          label="New chat"
          icon={newChatIcon}
          side="top"
          disabled={running}
          onClick={(event) => {
            handFocusTo(input, event);
            stopDictation();
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

/** The chats of this visit, in a popover. A reply has to end before a switch. */
function History({
  input,
  disabled,
}: {
  input: ComposerInput;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const picked = useRef(false);
  const stopDictation = useStopDictation();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) picked.current = false;
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <IconButton
            label="History"
            icon={icons.history}
            side="top"
            disabled={disabled}
          />
        }
      />
      <PopoverContent
        side="top"
        align="end"
        aria-label="Chats"
        finalFocus={() => (picked.current ? input.current : true)}
      >
        <ThreadList
          onPick={() => {
            stopDictation();
            picked.current = true;
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * The edges and corners that resize the bar. The one at the top is a button,
 * so the arrow keys resize too; the others are for a pointer only.
 */
function ResizeHandles({ geometry }: { geometry: Geometry }) {
  return (
    <>
      <button
        type="button"
        aria-label="Resize the assistant. Arrow keys change its size, Home puts it back."
        className="group/resize absolute inset-x-2 -top-1 flex h-2 cursor-ns-resize touch-none items-center justify-center outline-none pointer-coarse:-top-3 pointer-coarse:h-4"
        onKeyDown={geometry.resizeKeys}
        {...geometry.resizer(TOP)}
      >
        <span className="bg-border group-focus-visible/resize:bg-ring h-1 w-8 rounded-full opacity-0 transition-opacity duration-150 group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100" />
      </button>
      {HANDLES.map((handle) => (
        <div
          key={handle.className}
          aria-hidden
          className={cn("absolute touch-none max-sm:hidden", handle.className)}
          {...geometry.resizer(handle)}
        />
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Thread.                                                                    */
/* -------------------------------------------------------------------------- */

function Thread({ input }: { input: ComposerInput }) {
  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-auto flex-col overflow-y-auto">
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <SuggestionList input={input} />
      </AuiIf>
      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <ThreadPrimitive.Viewport className="flex min-h-0 flex-auto flex-col gap-4 overflow-y-auto overscroll-contain px-2 pt-2">
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
    <div className="mt-auto flex flex-col pb-1.5">
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

/**
 * What to ask next, once an edit by the assistant has landed on the open
 * page: prompts picked by the kind of edit it was.
 */
function FollowUps({ input }: { input: ComposerInput }) {
  const lastEdit = useDocumentStore((state) => state.lastEdit);
  const pageId = useDocumentStore((state) => state.currentPageId);
  const idle = useAuiState((s) => !s.thread.isEmpty && !s.thread.isRunning);
  if (!idle || lastEdit?.pageId !== pageId) return null;

  return (
    <div
      role="group"
      aria-label="Suggested next steps"
      className="flex shrink-0 flex-wrap gap-1.5 px-0.5 pt-1 pb-1.5"
    >
      {FOLLOW_UPS[lastEdit.kind].map((prompt) => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          send
          onClick={(event) => handFocusTo(input, event)}
          className={cn(chipClass, "h-7 max-w-full px-2.5")}
        >
          <span className="min-w-0 truncate">{prompt}</span>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end gap-2">
      <div className="flex max-w-[85%] min-w-0 flex-col items-end gap-1.5">
        <div className="flex flex-wrap justify-end gap-1.5 empty:hidden">
          <MessagePrimitive.Attachments>
            {() => <Attachment />}
          </MessagePrimitive.Attachments>
        </div>
        <MessagePrimitive.Quote>
          {(quote) => (
            <blockquote className={cn(quoted, "line-clamp-3")}>
              {quote.text}
            </blockquote>
          )}
        </MessagePrimitive.Quote>
        <div
          className={cn(
            field,
            radius.xl,
            "px-3 py-2 wrap-break-word whitespace-pre-wrap empty:hidden",
          )}
        >
          <MessagePrimitive.Parts>
            {({ part }) => (part.type === "text" ? part.text : null)}
          </MessagePrimitive.Parts>
        </div>
      </div>
      <Avatar
        src={PROFILE.you.avatar}
        name={PROFILE.you.name}
        className="mt-1.5"
      />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const last = useAuiState((s) => s.message.isLast);

  return (
    <MessagePrimitive.Root className="group px-1">
      <div className="relative flex min-w-0 flex-col gap-1.5">
        <AuiIf
          condition={(s) =>
            s.message.status?.type === "running" &&
            s.message.content.length === 0
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
              : "absolute start-0 top-full opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
          )}
        >
          <CopyButton />
          <ActionBarPrimitive.Reload asChild>
            <IconButton label="Retry" icon={retryIcon} side="bottom" />
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </div>
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
/* Attachments: a file on a message, as a chip.                               */
/* -------------------------------------------------------------------------- */

const thumb = "bg-muted h-6 shrink-0 rounded-[calc(var(--radius)-8px)]";

/** An attached picture, drawn small: from its file, or from what was sent. */
function Picture() {
  const file = useAuiState((s) => s.attachment.file);
  const sent = useAuiState((s) => {
    const part = s.attachment.content?.find((entry) => entry.type === "image");
    return part?.type === "image" ? part.image : undefined;
  });
  // The address of a file is the browser's to free, so it lasts as long as
  // the element that shows it.
  const showFile = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image || !file) return undefined;
      const url = URL.createObjectURL(file);
      image.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file],
  );

  return (
    <img
      ref={showFile}
      {...(file ? {} : { src: sent })}
      alt=""
      className={cn(thumb, "w-6 object-cover")}
    />
  );
}

function Attachment({ removable = false }: { removable?: boolean }) {
  const picture = useAuiState((s) => s.attachment.type === "image");

  return (
    <AttachmentPrimitive.Root
      className={cn(
        paper,
        radius.sm,
        "flex h-8 max-w-52 min-w-0 items-center gap-2 ps-1 pe-2.5",
      )}
    >
      {picture ? (
        <Picture />
      ) : (
        <AttachmentPrimitive.unstable_Thumb
          className={cn(
            thumb,
            "text-muted-foreground flex min-w-6 items-center justify-center px-1 font-mono text-[0.625rem]",
          )}
        />
      )}
      <span className="min-w-0 flex-1 truncate">
        <AttachmentPrimitive.Name />
      </span>
      {removable && (
        <AttachmentPrimitive.Remove asChild>
          <IconButton
            label="Remove the file"
            icon={icons.close}
            side="top"
            className="-me-2 size-6 pointer-coarse:size-7"
          />
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer.                                                                  */
/* -------------------------------------------------------------------------- */

function Composer({ input }: { input: ComposerInput }) {
  const running = useAuiState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root className="flex shrink-0 flex-col">
      <ComposerPrimitive.AttachmentDropzone
        className={cn(
          field,
          radius.xl,
          "has-[textarea:focus-visible]:border-ring data-[dragging=true]:border-ring flex flex-col border border-transparent transition-colors data-[dragging=true]:border-dashed motion-reduce:transition-none",
        )}
      >
        <Reference />
        <MicrophoneBlocked />
        <div className="flex flex-wrap gap-1.5 px-1.5 pt-1.5 empty:hidden">
          <ComposerPrimitive.Attachments>
            {() => <Attachment removable />}
          </ComposerPrimitive.Attachments>
        </div>
        <ComposerPrimitive.Input
          ref={input}
          rows={1}
          placeholder={running ? "Working" : "Ask the assistant"}
          aria-label="Message the assistant"
          className="placeholder:text-muted-foreground max-h-32 min-h-8 w-full resize-none bg-transparent px-3 pt-2 pb-1 text-sm leading-5 outline-none pointer-coarse:text-base"
        />
        <div className="flex items-center gap-0.5 p-1">
          <ComposerPrimitive.AddAttachment asChild>
            <IconButton label="Add files" icon={icons.attach} side="top" />
          </ComposerPrimitive.AddAttachment>
          <PermissionsMenu />
          <span className="min-w-0 flex-1" />
          <Dictation input={input} />
          {running ? (
            <ComposerPrimitive.Cancel
              asChild
              onClick={(event) => handFocusTo(input, event)}
            >
              <IconButton
                label="Stop"
                icon={icons.stop}
                side="top"
                className={cn(
                  primaryButton,
                  "[&>svg]:size-3 [&>svg]:fill-current",
                )}
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
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

/** The passage of the page, or the edit, that the next message is about. */
function Reference() {
  const edit = useAuiState((s) =>
    Boolean(s.composer.quote?.messageId.startsWith("edit:")),
  );

  return (
    <ComposerPrimitive.Quote className="flex items-start gap-2 ps-3 pe-1.5 pt-2">
      <Icon
        {...(edit ? icons.rename : icons.quote)}
        className="text-muted-foreground mt-px"
      />
      <span className="sr-only">
        {edit ? "About this edit:" : "About this passage:"}
      </span>
      <ComposerPrimitive.QuoteText
        className={cn(
          "text-muted-foreground line-clamp-2 min-w-0 flex-1",
          text.bodySm,
        )}
      />
      <ComposerPrimitive.QuoteDismiss asChild>
        <IconButton
          label={edit ? "Remove the edit" : "Remove the quote"}
          icon={icons.close}
          side="top"
          className="-mt-1 size-6 pointer-coarse:size-7"
        />
      </ComposerPrimitive.QuoteDismiss>
    </ComposerPrimitive.Quote>
  );
}

/** Whether an edit by the assistant lands at once or waits for review. */
function PermissionsMenu() {
  const mode = useDocumentStore((state) => state.editMode);
  const current = EDIT_MODE_COPY[mode];

  return (
    <Menu>
      <MenuTrigger
        aria-label={`Edit permissions: ${current.label}`}
        className={cn(
          textButtonClass,
          "text-muted-foreground hover:text-foreground data-popup-open:text-foreground gap-1 px-2",
        )}
      >
        <Icon {...current.icon} />
        {current.label}
        <Icon {...icons.chevronDown} className="size-3.5" />
      </MenuTrigger>
      <MenuContent side="top" className="w-64">
        <MenuLabel>Edits by the assistant</MenuLabel>
        <MenuRadioGroup
          value={mode}
          onValueChange={(value) => {
            const next = EDIT_MODES.find((entry) => entry === value);
            if (next) documentActions.setEditMode(next);
          }}
        >
          {EDIT_MODES.map((entry) => {
            const copy = EDIT_MODE_COPY[entry];
            return (
              <MenuRadioItem
                key={entry}
                value={entry}
                closeOnClick
                className="h-auto items-start py-1.5 pointer-coarse:h-auto [&>span:last-child]:mt-0.5"
              >
                <Icon {...copy.icon} className="mt-0.5" />
                <span className="flex min-w-0 flex-1 flex-col">
                  {copy.label}
                  <span className={cn("text-muted-foreground", text.bodySm)}>
                    {copy.description}
                  </span>
                </span>
              </MenuRadioItem>
            );
          })}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

/**
 * The microphone, where the browser can turn speech into text. What is heard
 * is written into the composer.
 */
function Dictation({ input }: { input: ComposerInput }) {
  const supported = useAuiState((s) => s.thread.capabilities.dictation);
  const listening = useAuiState((s) => s.composer.dictation != null);
  if (!supported) return null;

  if (listening) {
    return (
      <>
        <span
          role="status"
          className={cn(
            "text-muted-foreground flex items-center gap-1.5 px-1.5",
            text.small,
          )}
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 animate-pulse rounded-full bg-(--live) motion-reduce:animate-none"
          />
          Listening
        </span>
        <ComposerPrimitive.StopDictation
          asChild
          onClick={(event) => handFocusTo(input, event)}
        >
          <IconButton
            label="Stop dictating"
            icon={icons.mic}
            side="top"
            className="bg-accent text-foreground"
          />
        </ComposerPrimitive.StopDictation>
      </>
    );
  }

  return (
    <ComposerPrimitive.Dictate
      asChild
      onClick={(event) => handFocusTo(input, event)}
    >
      <IconButton label="Dictate" icon={icons.mic} side="top" />
    </ComposerPrimitive.Dictate>
  );
}

/** Why the last try to dictate heard nothing, until the next one starts. */
function MicrophoneBlocked() {
  const blocked = useAuiState((s) => {
    const end = s.composer.lastDictationEnd;
    return end?.reason === "error" && end.error?.code === "not-allowed";
  });
  if (!blocked) return null;

  return (
    <p role="alert" className={cn("text-destructive px-3 pt-2", text.bodySm)}>
      The microphone is blocked. Allow it for this site in the browser&apos;s
      settings, then dictate again.
    </p>
  );
}
