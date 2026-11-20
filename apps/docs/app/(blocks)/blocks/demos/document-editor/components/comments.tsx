"use client";

import { $unwrapMarkNode, MarkNode } from "@lexical/mark";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $nodesOfType, HISTORY_MERGE_TAG, type LexicalEditor } from "lexical";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import data from "../data.json";
import {
  type CommentAuthor,
  type CommentMessage,
  type CommentThread,
  documentActions,
  documentStore,
  useCurrentPage,
  useDocumentStore,
} from "../lib/document";
import {
  getMarkElements,
  markIdsAt,
  removeCommentMark,
  useActiveEditor,
  useEditorAnchor,
  useEditorScroller,
  useIsEditable,
} from "./editor";
import {
  Icon,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Tooltip,
  field,
  denseGlass,
  floating,
  icons,
  menuRowClass,
  menuSurfaceClass,
  radius,
  text,
  weight,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* The assistant's reply to a mention. Scripted here; a copy of the block     */
/* swaps `requestAssistantReply` for a call to its model.                     */
/* -------------------------------------------------------------------------- */

const ASSISTANT_NAME = "Assistant";
const MENTION = /(^|\s)@assistant\b/i;
const MENTION_PARTS = /(@assistant\b)/i;
const script = data.assistant.commentReplies;
const REPLY_DELAY = 1400;

const FILLER = /\b(?:really|very|just|quite|basically|actually|simply)\s+/gi;
const CLAUSE_BREAK =
  /[,;:.!?]\s|\s[–—-]\s|\s\(|\s(?:so that|so|because|since|once|which|while|although|though)\s/gi;
const QUESTION =
  /\?|^(?:what|why|how|who|when|where|which|is|are|can|could|should|would|will)\b/;
const SWAPS = script.swaps.map(({ from, to }) => ({
  pattern: new RegExp(
    `\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "gi",
  ),
  to,
}));

const matchCase = (value: string, model: string) =>
  /^\p{Lu}/u.test(model)
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : value;

/** The passage up to its first break, when that leaves three words or more. */
function firstClause(passage: string) {
  const cut = [...passage.matchAll(CLAUSE_BREAK)].find(
    (match) => passage.slice(0, match.index).trim().split(/\s+/).length >= 3,
  );
  if (!cut) return passage;
  return passage.slice(0, cut.index) + (/[.!?]$/.exec(passage)?.[0] ?? "");
}

const REWRITES: Record<string, (passage: string) => string> = {
  shorten: (passage) =>
    firstClause(matchCase(passage.replace(FILLER, ""), passage)),
  reword: (passage) =>
    SWAPS.reduce(
      (value, { pattern, to }) =>
        value.replace(pattern, (found) => matchCase(to, found)),
      passage,
    ),
  clarify: (passage) =>
    passage.replace(/[.!?]*$/, (end) => `${script.blanks}${end}`),
};

/**
 * The scripted reply to a mention, built from the quoted passage and what was
 * asked: a rewrite of the passage, a short answer to a question, or a line on
 * what the script can do. The lines are in data.json under
 * `assistant.commentReplies`; a new rewrite `id` needs an entry in `REWRITES`.
 */
function scriptedReply(quote: string, message: string) {
  const passage = quote.replace(/\s+/g, " ").trim();
  const asked = message
    .replace(/@assistant\b[,:]?/gi, " ")
    .trim()
    .toLowerCase();
  const say = (
    line: { text: string; empty?: string | undefined },
    rewrite: string,
  ) =>
    (rewrite === passage ? (line.empty ?? line.text) : line.text).replace(
      /\{quote\}|\{rewrite\}/g,
      (slot) => (slot === "{quote}" ? shorten(passage) : rewrite),
    );
  const intent = script.rewrites.find((entry) =>
    entry.match.some((keyword) => asked.includes(keyword)),
  );
  if (intent) return say(intent, REWRITES[intent.id]?.(passage) ?? passage);
  if (QUESTION.test(asked)) return say(script.question, firstClause(passage));
  return script.fallback;
}

let replying: ReadonlySet<string> = new Set();
const replyingListeners = new Set<() => void>();

const subscribeReplying = (listener: () => void) => {
  replyingListeners.add(listener);
  return () => {
    replyingListeners.delete(listener);
  };
};

function setReplying(threadId: string, waiting: boolean) {
  const next = new Set(replying);
  if (waiting) next.add(threadId);
  else next.delete(threadId);
  replying = next;
  for (const listener of replyingListeners) listener();
}

const useIsReplying = (threadId: string) =>
  useSyncExternalStore(
    subscribeReplying,
    () => replying.has(threadId),
    () => false,
  );

function requestAssistantReply(threadId: string, message: string) {
  if (replying.has(threadId)) return;
  setReplying(threadId, true);
  window.setTimeout(() => {
    setReplying(threadId, false);
    const thread = documentStore
      .getState()
      .threads.find((item) => item.id === threadId);
    if (!thread || thread.resolved) return;
    documentActions.addThreadMessage(threadId, {
      author: "assistant",
      text: scriptedReply(thread.quote, message),
    });
  }, REPLY_DELAY);
}

/* -------------------------------------------------------------------------- */
/* Small shared pieces.                                                       */
/* -------------------------------------------------------------------------- */

const CLOCK_STEP = 30_000;

const subscribeClock = (listener: () => void) => {
  const timer = window.setInterval(listener, CLOCK_STEP);
  return () => window.clearInterval(timer);
};

const useNow = () =>
  useSyncExternalStore(
    subscribeClock,
    () => Math.ceil(Date.now() / CLOCK_STEP) * CLOCK_STEP,
    () => 0,
  );

function relativeTime(now: number, then: number) {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const WIDE_QUERY = "(min-width: 640px)";

const subscribeWide = (listener: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

/** False on a phone-width frame, where the right gutter holds no marker. */
const useIsWide = () =>
  useSyncExternalStore(
    subscribeWide,
    () =>
      typeof window.matchMedia !== "function" ||
      window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );

const shorten = (value: string, length = 60) =>
  value.length > length ? `${value.slice(0, length - 1).trimEnd()}…` : value;

const authorName = (author: CommentAuthor) =>
  author === "assistant" ? ASSISTANT_NAME : "You";

function Avatar({
  author,
  className,
}: {
  author: CommentAuthor;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] leading-none",
        weight.strong,
        author === "assistant"
          ? "bg-accent text-foreground"
          : "bg-foreground text-background",
        className,
      )}
    >
      {author === "assistant" ? (
        <Icon {...icons.assistant} className="size-3.5" />
      ) : (
        "Y"
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Inside the composer: the highlights follow their threads.                  */
/* -------------------------------------------------------------------------- */

/**
 * Keeps the page and the threads in step. A highlight stays only while its
 * thread is open: a thread whose passage was deleted is held as resolved (and
 * comes back if undo restores the passage), any other resolved thread and a
 * draft left without a message are removed with their highlights, and a
 * highlight with no open thread is taken off.
 */
function reconcile(
  editor: LexicalEditor,
  pageId: string,
  orphaned: Set<string>,
) {
  if (!editor.isEditable()) return;
  const state = documentStore.getState();
  const present = editor
    .getEditorState()
    .read(
      () => new Set($nodesOfType(MarkNode).flatMap((mark) => mark.getIDs())),
    );
  const keep = new Set<string>();

  for (const thread of state.threads) {
    if (thread.pageId !== pageId) continue;
    const marked = present.has(thread.markId);
    if (thread.messages.length === 0) {
      if (thread.id === state.activeThreadId) keep.add(thread.markId);
      else documentActions.deleteThread(thread.id);
    } else if (!thread.resolved) {
      if (marked) keep.add(thread.markId);
      else {
        orphaned.add(thread.id);
        documentActions.resolveThread(thread.id);
      }
    } else if (!orphaned.has(thread.id)) {
      documentActions.deleteThread(thread.id);
    } else if (marked) {
      orphaned.delete(thread.id);
      keep.add(thread.markId);
      documentActions.resolveThread(thread.id, false);
    }
  }

  const stray = [...present].filter((id) => !keep.has(id));
  if (stray.length === 0) return;
  editor.update(
    () => {
      for (const mark of $nodesOfType(MarkNode)) {
        for (const id of stray) if (mark.hasID(id)) mark.deleteID(id);
        if (mark.getIDs().length === 0) $unwrapMarkNode(mark);
      }
    },
    { tag: HISTORY_MERGE_TAG },
  );
}

/** Keeps the comment highlights in step with their threads. Renders inside the composer. */
export function CommentMarks() {
  const [editor] = useLexicalComposerContext();
  const [pageId] = useState(() => documentStore.getState().currentPageId);
  const threads = useDocumentStore((state) => state.threads);
  const activeThreadId = useDocumentStore((state) => state.activeThreadId);
  const editable = useIsEditable();
  const orphaned = useRef(new Set<string>());

  const activeMarkId = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId)?.markId,
    [threads, activeThreadId],
  );

  // `threads`, `activeThreadId` and `editable` are deps so a change in any of
  // them runs the check again; the check itself reads the live store.
  useEffect(() => {
    let timer = 0;
    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => reconcile(editor, pageId, orphaned.current),
        delay,
      );
    };
    schedule(0);
    const unregister = editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves }) => {
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) schedule(300);
      },
    );
    return () => {
      window.clearTimeout(timer);
      unregister();
    };
  }, [editor, pageId, threads, activeThreadId, editable]);

  useEffect(() => {
    const paint = () => {
      const root = editor.getRootElement();
      if (!root) return;
      const active = new Set(
        activeMarkId ? getMarkElements(editor, activeMarkId) : [],
      );
      for (const mark of root.querySelectorAll("mark[data-active]")) {
        if (!active.has(mark as HTMLElement))
          mark.removeAttribute("data-active");
      }
      for (const mark of active) mark.setAttribute("data-active", "true");
    };
    paint();
    const unregister = editor.registerUpdateListener(paint);
    return () => {
      unregister();
      for (const mark of editor
        .getRootElement()
        ?.querySelectorAll("mark[data-active]") ?? []) {
        mark.removeAttribute("data-active");
      }
    };
  }, [editor, activeMarkId]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const state = documentStore.getState();
      if (!state.commentsVisible || !(event.target instanceof Node)) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      for (const markId of markIdsAt(editor, event.target)) {
        const thread = state.threads.find(
          (item) =>
            item.pageId === pageId && !item.resolved && item.markId === markId,
        );
        if (!thread) continue;
        documentActions.setActiveThread(thread.id);
        return;
      }
    };
    return editor.registerRootListener((root, previous) => {
      previous?.removeEventListener("click", onClick);
      root?.addEventListener("click", onClick);
    });
  }, [editor, pageId]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Where each highlight sits, measured against the content column.            */
/* -------------------------------------------------------------------------- */

type Spot = { top: number; bottom: number; left: number };

type Layout = {
  spots: Record<string, Spot>;
  /** Width of the content column, gutters included. */
  width: number;
  /** Free space between the column and the right edge of the page. */
  room: number;
};

const NO_LAYOUT: Layout = { spots: {}, width: 0, room: 0 };

function useLayout(
  editor: LexicalEditor | null,
  anchor: HTMLElement | null,
  scroller: HTMLElement | null,
  threads: readonly CommentThread[],
) {
  const [layout, setLayout] = useState(NO_LAYOUT);

  useEffect(() => {
    if (!editor || !anchor) return;
    let frame = 0;
    const measure = () => {
      const box = anchor.getBoundingClientRect();
      const spots: Record<string, Spot> = {};
      for (const thread of threads) {
        const rect = getMarkElements(editor, thread.markId)[0]
          ?.getClientRects()
          .item(0);
        if (!rect) continue;
        spots[thread.id] = {
          top: Math.round(rect.top - box.top),
          bottom: Math.round(rect.bottom - box.top),
          left: Math.round(rect.left - box.left),
        };
      }
      const edge = scroller?.getBoundingClientRect().right ?? box.right;
      const next: Layout = {
        spots,
        width: Math.round(box.width),
        room: Math.round(edge - box.right),
      };
      setLayout((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    schedule();
    const unregister = editor.registerUpdateListener(schedule);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    observer?.observe(anchor);
    if (scroller) observer?.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      unregister();
      observer?.disconnect();
    };
  }, [editor, anchor, scroller, threads]);

  return layout;
}

const CARD_WIDTH = 360;
const CARD_GAP = 8;
const MIN_CARD_HEIGHT = 160;
const MARKER_SIZE = 24;
const SCROLLBAR_ALLOWANCE = 16;
/** The strip at the top of the page that the floating pills take. */
const PILLS_ROOM = 60;
const ASSISTANT_BAR = "[data-assistant-bar]";

/** Beside the highlight when the margin has room, in the column otherwise. */
function placeCard(spot: Spot, layout: Layout) {
  const width = Math.min(CARD_WIDTH, layout.width - 24);
  const beside = layout.room - SCROLLBAR_ALLOWANCE >= width - 8 + 12;
  const left = beside
    ? layout.width - 8
    : Math.max(12, Math.min(spot.left, layout.width - width - 12));
  return { beside, style: { width, left } };
}

/**
 * Sets the card's height limit and its vertical place, so that it stays
 * between the top pills and the assistant bar while the page scrolls under
 * it. A card in the column sits under its highlight, or above it when the bar
 * leaves no room there. Without a `spot` the card is a sheet at the bottom.
 */
function fitCard(
  card: HTMLElement,
  scroller: HTMLElement,
  bar: Element | null,
  spot: Spot | undefined,
  beside: boolean,
) {
  const view = scroller.getBoundingClientRect();
  const box = card.getBoundingClientRect();
  const blocker = bar?.getBoundingClientRect();
  let ceiling = view.top + PILLS_ROOM;
  let floor = view.bottom - CARD_GAP;
  if (blocker && blocker.left < box.right && blocker.right > box.left) {
    // The bar can be dragged up the page, so the card takes the taller side.
    if (blocker.top - ceiling >= floor - blocker.bottom) {
      floor = blocker.top - CARD_GAP;
    } else {
      ceiling = blocker.bottom + CARD_GAP;
    }
  }
  floor = Math.max(floor, ceiling + MIN_CARD_HEIGHT);

  if (!spot) {
    card.style.maxHeight = `${Math.round(Math.min(floor - ceiling, view.height * 0.7))}px`;
    card.style.bottom = `${view.bottom - floor}px`;
    return;
  }
  card.style.maxHeight = `${floor - ceiling}px`;
  const origin = card.offsetParent?.getBoundingClientRect().top ?? view.top;
  const height = card.offsetHeight;
  const above = origin + spot.top - CARD_GAP - height;
  let top = origin + (beside ? spot.top - 12 : spot.bottom + CARD_GAP);
  if (!beside && top + height > floor && above >= ceiling) top = above;
  top = Math.max(ceiling, Math.min(top, floor - height));
  card.style.top = `${Math.round(top - origin)}px`;
}

/* -------------------------------------------------------------------------- */
/* The thread card.                                                           */
/* -------------------------------------------------------------------------- */

let focusRequest: string | null = null;

const markerOf = (threadId: string) =>
  document.querySelector<HTMLElement>(
    `[data-thread-marker="${CSS.escape(threadId)}"]`,
  );

function MessageText({ value }: { value: string }) {
  return (
    <p className="wrap-break-word whitespace-pre-wrap">
      {value.split(MENTION_PARTS).map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className={weight.strong}>
            @{ASSISTANT_NAME}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function Message({ message, now }: { message: CommentMessage; now: number }) {
  return (
    <li className="flex gap-2.5">
      <Avatar author={message.author} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline gap-2">
          <span className={weight.strong}>{authorName(message.author)}</span>
          {now > 0 ? (
            <time
              dateTime={new Date(message.createdAt).toISOString()}
              className={cn("text-muted-foreground", text.small)}
            >
              {relativeTime(now, message.createdAt)}
            </time>
          ) : null}
        </div>
        <MessageText value={message.text} />
      </div>
    </li>
  );
}

type MentionQuery = { start: number };

function mentionAt(value: string, caret: number): MentionQuery | null {
  const match = /(?:^|\s)@([a-z]*)$/i.exec(value.slice(0, caret));
  const query = match?.[1]?.toLowerCase();
  if (query === undefined) return null;
  const name = ASSISTANT_NAME.toLowerCase();
  if (query === name || !name.startsWith(query)) return null;
  return { start: caret - query.length - 1 };
}

function ReplyField({
  thread,
  fieldRef,
}: {
  thread: CommentThread;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const listId = useId();
  const optionId = useId();
  const draft = thread.messages.length === 0;
  const mention = dismissed ? null : mentionAt(value, caret);
  const ready = value.trim().length > 0;

  const accept = (query: MentionQuery) => {
    const inserted = `@${ASSISTANT_NAME} `;
    const position = query.start + inserted.length;
    setValue(value.slice(0, query.start) + inserted + value.slice(caret));
    setCaret(position);
    requestAnimationFrame(() => {
      fieldRef.current?.focus({ preventScroll: true });
      fieldRef.current?.setSelectionRange(position, position);
    });
  };

  const send = () => {
    const message = value.trim();
    if (!message) return;
    documentActions.addThreadMessage(thread.id, {
      author: "you",
      text: message,
    });
    setValue("");
    setCaret(0);
    if (MENTION.test(message)) requestAssistantReply(thread.id, message);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (mention) {
      if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
        event.preventDefault();
        accept(mention);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setDismissed(true);
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      {mention ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Mention"
          className={cn(
            menuSurfaceClass,
            "absolute bottom-full left-0 mb-1.5 min-w-40",
          )}
        >
          <div
            id={optionId}
            role="option"
            aria-selected
            tabIndex={-1}
            className={cn(menuRowClass, "bg-accent")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => accept(mention)}
          >
            <Icon {...icons.assistant} />
            {ASSISTANT_NAME}
            <kbd
              className={cn("text-muted-foreground ms-auto ps-3", text.small)}
            >
              Tab
            </kbd>
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          field,
          radius.md,
          "focus-within:border-ring flex items-end gap-1 border border-transparent py-1 ps-3 pe-1 transition-colors motion-reduce:transition-none",
        )}
      >
        <textarea
          ref={fieldRef}
          rows={1}
          value={value}
          placeholder={
            draft
              ? `Add a comment or @${ASSISTANT_NAME}`
              : `Reply or @${ASSISTANT_NAME}`
          }
          aria-label={draft ? "Add a comment" : "Reply to this comment"}
          {...(mention
            ? {
                role: "combobox",
                "aria-haspopup": "listbox" as const,
                "aria-expanded": true,
                "aria-controls": listId,
                "aria-activedescendant": optionId,
              }
            : {})}
          className="placeholder:text-muted-foreground field-sizing-content max-h-32 min-h-7 min-w-0 flex-1 resize-none bg-transparent py-1 outline-none"
          onChange={(event) => {
            setValue(event.target.value);
            setCaret(event.target.selectionStart);
            setDismissed(false);
          }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={onKeyDown}
        />
        <button
          type="submit"
          disabled={!ready}
          aria-label={draft ? "Send comment" : "Send reply"}
          className="bg-foreground text-background focus-visible:border-ring flex size-7 shrink-0 items-center justify-center rounded-full border border-transparent transition-[opacity,scale] duration-150 outline-none active:scale-[0.96] disabled:opacity-30 motion-reduce:transition-none motion-reduce:active:scale-100 pointer-coarse:size-9"
        >
          <Icon {...icons.send} />
        </button>
      </div>
    </form>
  );
}

function ThreadCard({
  thread,
  editor,
  now,
  scroller,
  spot,
  beside = false,
  className,
  style,
}: {
  thread: CommentThread;
  editor: LexicalEditor;
  now: number;
  scroller: HTMLElement | null;
  /** Where the highlight sits, for a card placed by it. */
  spot?: Spot;
  beside?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const waiting = useIsReplying(thread.id);
  const { id: threadId, markId } = thread;
  const draft = thread.messages.length === 0;
  const count = thread.messages.length;

  // `count` and `waiting` are deps so a new message is fitted before the list
  // scrolls to it.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !scroller) return;
    const bar = scroller.parentElement?.querySelector(ASSISTANT_BAR) ?? null;
    const fit = () => fitCard(card, scroller, bar, spot, beside);
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const sizes =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    for (const element of [card, scroller, bar]) {
      if (element) sizes?.observe(element);
    }
    const moves = new MutationObserver(schedule);
    if (bar) {
      moves.observe(bar, { attributes: true, attributeFilter: ["style"] });
    }
    scroller.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      sizes?.disconnect();
      moves.disconnect();
      scroller.removeEventListener("scroll", schedule);
    };
  }, [scroller, spot, beside, count, waiting]);

  useEffect(() => {
    const opened = documentStore
      .getState()
      .threads.find((item) => item.id === threadId);
    if (opened?.messages.length === 0 || focusRequest === threadId) {
      fieldRef.current?.focus({ preventScroll: true });
    }
    focusRequest = null;
  }, [threadId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || (count === 0 && !waiting)) return;
    list.scrollTop = list.scrollHeight;
  }, [count, waiting]);

  useEffect(() => {
    const close = (restoreFocus: boolean) => {
      documentActions.setActiveThread(null, threadId);
      if (!restoreFocus) return;
      const marker = markerOf(threadId);
      const kept =
        (documentStore.getState().threads.find((item) => item.id === threadId)
          ?.messages.length ?? 0) > 0;
      if (marker && kept) marker.focus({ preventScroll: true });
      else editor.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (cardRef.current?.contains(target)) return;
      if (target.closest('[role="menu"], [data-thread-marker]')) return;
      if (markIdsAt(editor, target).includes(markId)) return;
      close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[role="menu"]')) {
        return;
      }
      const input = fieldRef.current;
      if (target === input && input.getAttribute("aria-expanded") === "true") {
        return;
      }
      if (cardRef.current?.contains(target)) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      } else if (
        target === document.body ||
        editor.getRootElement()?.contains(target) ||
        target.closest("[data-thread-marker]")
      ) {
        close(false);
      }
    };
    // Capture on window: the assistant bar cancels Escape at the document
    // whenever focus is outside it, before a bubbling listener would see it.
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [editor, threadId, markId]);

  const leave = () => {
    removeCommentMark(editor, markId);
    editor.focus();
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Comment on “${shorten(thread.quote)}”`}
      style={style}
      className={cn(
        floating,
        denseGlass,
        radius.lg,
        text.body,
        "text-popover-foreground flex flex-col gap-2 p-2 transition-[opacity,scale] duration-150 motion-reduce:transition-none starting:scale-[0.98] starting:opacity-0",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 ps-1.5">
        <span
          aria-hidden
          className="h-4 w-0.5 shrink-0 rounded-full bg-(--comment-active)"
        />
        <p
          className={cn(
            "text-muted-foreground min-w-0 flex-1 truncate ps-2",
            text.bodySm,
          )}
        >
          {thread.quote}
        </p>
        {draft ? null : (
          <Menu>
            <MenuTrigger
              render={
                <IconButton
                  label="Comment options"
                  icon={icons.more}
                  side="top"
                />
              }
            />
            <MenuContent align="end" sideOffset={6}>
              <MenuItem
                onClick={() => {
                  documentActions.deleteThread(threadId);
                  leave();
                }}
              >
                <Icon {...icons.tick} />
                Resolve
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
        <IconButton
          label={draft ? "Discard comment" : "Close"}
          icon={icons.close}
          side="top"
          onClick={() => {
            documentActions.setActiveThread(null, threadId);
            if (draft) editor.focus();
            else markerOf(threadId)?.focus({ preventScroll: true });
          }}
        />
      </div>
      {draft && !waiting ? null : (
        <ol
          ref={listRef}
          aria-label="Comments"
          className="flex max-h-72 min-h-0 flex-col gap-3 overflow-y-auto px-1.5 py-1"
        >
          {thread.messages.map((message) => (
            <Message key={message.id} message={message} now={now} />
          ))}
          {waiting ? (
            <li
              role="status"
              className="text-muted-foreground flex items-center gap-2.5"
            >
              <Avatar author="assistant" />
              <span className="shimmer motion-reduce:animate-none">
                {ASSISTANT_NAME} is replying
              </span>
            </li>
          ) : null}
        </ol>
      )}
      <ReplyField thread={thread} fieldRef={fieldRef} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The margin markers and the open card.                                      */
/* -------------------------------------------------------------------------- */

function useAnnouncement() {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const seen = new Set<string>();
    const scan = (announce: boolean) => {
      const state = documentStore.getState();
      for (const thread of state.threads) {
        for (const message of thread.messages) {
          if (message.author !== "assistant" || seen.has(message.id)) continue;
          seen.add(message.id);
          if (announce && thread.pageId === state.currentPageId) {
            setAnnouncement(
              `${ASSISTANT_NAME} commented on “${shorten(thread.quote)}”: ${message.text}`,
            );
          }
        }
      }
    };
    scan(false);
    return documentStore.subscribe(() => scan(true));
  }, []);

  return announcement;
}

/** The margin markers and the floating thread cards. Renders over the page. */
export function CommentThreads() {
  const editor = useActiveEditor();
  const anchor = useEditorAnchor();
  const scroller = useEditorScroller();
  const page = useCurrentPage();
  const threads = useDocumentStore((state) => state.threads);
  const activeThreadId = useDocumentStore((state) => state.activeThreadId);
  const commentsVisible = useDocumentStore((state) => state.commentsVisible);
  const wide = useIsWide();
  const now = useNow();
  const announcement = useAnnouncement();

  const open = useMemo(
    () =>
      threads.filter(
        (thread) =>
          thread.pageId === page.id &&
          !thread.resolved &&
          (thread.messages.length > 0 || thread.id === activeThreadId),
      ),
    [threads, page.id, activeThreadId],
  );
  const active = open.find((thread) => thread.id === activeThreadId);
  const layout = useLayout(editor, anchor, scroller, open);

  const markers = useMemo(() => {
    let floor = Number.NEGATIVE_INFINITY;
    return open
      .flatMap((thread) => {
        const spot = layout.spots[thread.id];
        return spot ? [{ thread, spot }] : [];
      })
      .sort((a, b) => a.spot.top - b.spot.top)
      .map(({ thread, spot }) => {
        const top = Math.max(
          Math.round((spot.top + spot.bottom - MARKER_SIZE) / 2),
          floor,
        );
        floor = top + MARKER_SIZE + 4;
        return { thread, top };
      });
  }, [open, layout]);

  useEffect(() => {
    if (activeThreadId && !commentsVisible) {
      documentActions.setCommentsVisible(true);
    }
  }, [activeThreadId, commentsVisible]);

  const activeSpot = active ? layout.spots[active.id] : undefined;
  const placed = activeSpot
    ? { spot: activeSpot, ...placeCard(activeSpot, layout) }
    : undefined;

  return (
    <>
      {editor && anchor
        ? createPortal(
            <>
              {commentsVisible
                ? markers.map(({ thread, top }) => {
                    const expanded = thread.id === activeThreadId;
                    const count = thread.messages.length;
                    return (
                      <Tooltip
                        key={thread.id}
                        label={count > 1 ? `${count} comments` : "Open comment"}
                        side="left"
                      >
                        <button
                          type="button"
                          data-thread-marker={thread.id}
                          aria-label={`Comment on “${shorten(thread.quote)}”`}
                          aria-expanded={expanded}
                          style={{ top }}
                          className={cn(
                            "border-background focus-visible:border-ring absolute z-10 flex rounded-full border-2 transition-[scale,box-shadow,opacity] duration-150 outline-none hover:scale-110 active:scale-[0.96] aria-expanded:shadow-[0_0_0_2px_var(--comment-active)] motion-reduce:transition-none motion-reduce:hover:scale-100",
                            wide
                              ? "right-3.5"
                              : "pointer-events-none -right-0.5 scale-75 opacity-0 focus-visible:opacity-100",
                          )}
                          onClick={() => {
                            if (expanded) {
                              documentActions.setActiveThread(null);
                              return;
                            }
                            focusRequest = thread.id;
                            documentActions.setActiveThread(thread.id);
                          }}
                        >
                          <Avatar
                            author={thread.messages[0]?.author ?? "you"}
                            className={
                              thread.messages[0]?.author === "assistant"
                                ? "bg-background dark:bg-popover border-border/60 border"
                                : ""
                            }
                          />
                        </button>
                      </Tooltip>
                    );
                  })
                : null}
              {wide && active && placed ? (
                <ThreadCard
                  key={active.id}
                  thread={active}
                  editor={editor}
                  now={now}
                  scroller={scroller}
                  spot={placed.spot}
                  beside={placed.beside}
                  style={placed.style}
                  className="absolute z-45"
                />
              ) : null}
            </>,
            anchor,
          )
        : null}
      {editor && active && !wide ? (
        <ThreadCard
          key={active.id}
          thread={active}
          editor={editor}
          now={now}
          scroller={scroller}
          style={{ backgroundColor: "var(--popover)" }}
          className="absolute inset-x-2 bottom-2 z-45 max-h-[70%]"
        />
      ) : null}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
