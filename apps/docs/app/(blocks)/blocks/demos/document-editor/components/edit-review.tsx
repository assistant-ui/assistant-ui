"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  documentActions,
  plainText,
  PROFILE,
  useCurrentPage,
  useDocumentStore,
  type Block,
  type PendingReview,
} from "../lib/document";
import {
  $readBlocks,
  getBlockElement,
  idsOf,
  prefersReducedMotion,
  undoPendingReview,
  useEditorAnchor,
  useEditorScroller,
  useIsEditable,
} from "./editor";
import {
  denseGlass,
  Icon,
  icons,
  Pill,
  primaryButtonClass,
  textButtonClass,
  Tooltip,
} from "./ui";

const EDGE = 8;
const GAP = 8;
/** The strip at the top of the page that the floating pills take. */
const PILLS_ROOM = 60;
const ASSISTANT_BAR = "[data-assistant-bar]";
const FIELDS = 'input, textarea, select, [contenteditable="true"]';

const SHORTCUTS = {
  apple: { accept: "⌘↵", undo: "⌘⌫", modifier: "Meta", spoken: "Command" },
  other: {
    accept: "Ctrl+Enter",
    undo: "Ctrl+Backspace",
    modifier: "Control",
    spoken: "Control",
  },
} as const;

const shortcuts = () =>
  SHORTCUTS[/Mac|iP(hone|ad|od)/.test(navigator.userAgent) ? "apple" : "other"];

const count = (amount: number) =>
  `${amount} ${amount === 1 ? "block" : "blocks"}`;

const summaryOf = (review: PendingReview) =>
  [
    review.changed.length > 0 && `changed ${count(review.changed.length)}`,
    review.removed > 0 && `removed ${count(review.removed)}`,
  ]
    .filter(Boolean)
    .join(" and ");

const readableText = (block: Block) =>
  block.type === "table"
    ? (block.rows ?? []).map((row) => row.map(plainText).join(" | ")).join("\n")
    : plainText(block.text);

// A field that holds text uses the review's keys for that text. The page
// uses Backspace with the modifier to delete a word or a line.
const holdsText = (field: Element) =>
  (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
    ? field.value
    : field.textContent) !== "";

/**
 * The pill under an edit by the assistant that waits for review: Undo, Ask
 * for change, Accept. It sits under the last block the edit changed and
 * follows it as the page scrolls; with that block out of view it waits at the
 * nearer edge of the page, clear of the top pills and the assistant bar.
 * While it shows, Cmd or Ctrl with Enter accepts, from the page or from an
 * empty field, and with Backspace undoes, from an empty field or with the
 * keyboard outside any field.
 */
export function EditReview() {
  const [editor] = useLexicalComposerContext();
  const page = useCurrentPage();
  const anchor = useEditorAnchor();
  const scroller = useEditorScroller();
  const editable = useIsEditable();
  const pending = useDocumentStore((state) => state.pendingReview);
  // The page cannot be put back while the assistant is still writing in it.
  const review = editable && pending?.pageId === page.id ? pending : null;
  const pill = useRef<HTMLDivElement>(null);
  const revealed = useRef<PendingReview | null>(null);

  // An answer given from inside the pill takes the pill away, so the keyboard
  // goes back to the page.
  const answer = useCallback(
    (act: () => void) => {
      const within = pill.current?.contains(document.activeElement);
      act();
      if (within) editor.getRootElement()?.focus({ preventScroll: true });
    },
    [editor],
  );

  const accept = useCallback(
    () => answer(() => documentActions.acceptReview()),
    [answer],
  );
  const undo = useCallback(() => answer(undoPendingReview), [answer]);

  const askForChange = () => {
    if (!review) return;
    const changed = new Set(review.changed);
    const text = editor
      .getEditorState()
      .read(() => $readBlocks(idsOf(editor)))
      .filter((block) => changed.has(block.id))
      .map(readableText)
      .filter(Boolean)
      .join("\n");
    documentActions.askAssistant({
      kind: "edit",
      pageId: review.pageId,
      blockIds: review.changed,
      text,
    });
  };

  useEffect(() => {
    if (!review) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "Backspace") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey || event.isComposing) return;
      const field =
        event.target instanceof Element ? event.target.closest(FIELDS) : null;
      const inPage = !!field && !!editor.getRootElement()?.contains(field);
      if (inPage ? event.key === "Backspace" : field && holdsText(field)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Enter") accept();
      else undo();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [accept, editor, review, undo]);

  useLayoutEffect(() => {
    const element = pill.current;
    if (!element || !anchor || !scroller || !review) return;
    const lastChanged = review.changed.at(-1);
    let target: HTMLElement | null = null;
    let bar: Element | null = null;
    let frame = 0;

    // An edit that landed out of view is scrolled to, once. The bar is often
    // still growing then, which moves where the pill goes, so the page keeps
    // heading there until the pill is under its block or the person scrolls.
    let seeking = revealed.current !== review;
    revealed.current = review;
    const stopSeeking = () => {
      seeking = false;
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(true));
    };
    const sizes =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    const moves = new MutationObserver(schedule);

    const place = (seek = false) => {
      if (lastChanged && !target?.isConnected) {
        target = getBlockElement(lastChanged);
      }
      // The bar is another element once it is minimized or opened again.
      const found =
        scroller.parentElement?.querySelector(ASSISTANT_BAR) ?? null;
      if (found !== bar) {
        if (bar) sizes?.unobserve(bar);
        moves.disconnect();
        bar = found;
        if (bar) {
          sizes?.observe(bar);
          moves.observe(bar, { attributes: true, attributeFilter: ["style"] });
        }
      }

      const view = scroller.getBoundingClientRect();
      const column = anchor.getBoundingClientRect();
      const block = target?.getBoundingClientRect();
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const under = block ?? column;
      const left = Math.max(
        view.left + EDGE,
        Math.min(
          under.left + (under.width - width) / 2,
          view.right - EDGE - width,
        ),
      );

      let ceiling = view.top + PILLS_ROOM;
      let floor = view.bottom - EDGE;
      const blocker = bar?.getBoundingClientRect();
      if (blocker && blocker.left < left + width && blocker.right > left) {
        // The bar can be dragged up the page, so the pill takes the taller side.
        if (blocker.top - ceiling >= floor - blocker.bottom) {
          floor = blocker.top - GAP;
        } else {
          ceiling = blocker.bottom + GAP;
        }
      }
      const lowest = Math.max(ceiling, floor - height);
      const wanted = block ? block.bottom + GAP : lowest;
      const top = Math.max(ceiling, Math.min(wanted, lowest));

      // Under its block the pill is part of the page and scrolls with it.
      // Held at an edge it is fixed, so it stays still while the page moves.
      const follows = block !== undefined && top === wanted;
      element.style.position = follows ? "absolute" : "fixed";
      element.style.left = `${Math.round(left - (follows ? column.left : 0))}px`;
      element.style.top = `${Math.round(top - (follows ? column.top : 0))}px`;

      if (follows) seeking = false;
      if (!seek || !seeking || !block || floor - height < ceiling) return;
      const shift =
        wanted > lowest
          ? wanted - lowest
          : Math.min(0, Math.max(block.top - ceiling, wanted - lowest));
      if (shift !== 0) {
        scroller.scrollBy({
          top: shift,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
    };

    place(true);

    const follow = () => place();
    for (const observed of [element, scroller, anchor]) {
      sizes?.observe(observed);
    }
    scroller.addEventListener("scroll", follow, { passive: true });
    scroller.addEventListener("wheel", stopSeeking, { passive: true });
    scroller.addEventListener("touchmove", stopSeeking, { passive: true });
    const unregister = editor.registerUpdateListener(schedule);
    return () => {
      cancelAnimationFrame(frame);
      sizes?.disconnect();
      moves.disconnect();
      scroller.removeEventListener("scroll", follow);
      scroller.removeEventListener("wheel", stopSeeking);
      scroller.removeEventListener("touchmove", stopSeeking);
      unregister();
    };
  }, [anchor, editor, review, scroller]);

  if (!anchor) return null;

  const keys = shortcuts();

  return createPortal(
    <>
      <p role="status" className="sr-only">
        {review
          ? `${PROFILE.assistant.name} ${summaryOf(review)}. ${keys.spoken} Enter accepts the edit. Outside the page, ${keys.spoken} Backspace undoes it.`
          : ""}
      </p>
      {review ? (
        <Pill
          ref={pill}
          role="group"
          aria-label={`Review the edit by ${PROFILE.assistant.name}`}
          className={cn(
            denseGlass,
            "z-35 max-w-[calc(100vw-1rem)] whitespace-nowrap transition-[opacity,scale] duration-150 starting:opacity-0 motion-safe:starting:scale-[0.96] pointer-coarse:h-11",
          )}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Tooltip label={`Put the page back as it was (${keys.undo})`}>
            <button
              type="button"
              aria-keyshortcuts={`${keys.modifier}+Backspace`}
              className={cn(textButtonClass, "ps-2")}
              onClick={undo}
            >
              <Icon {...icons.undo} className="text-muted-foreground" />
              Undo
            </button>
          </Tooltip>
          <Tooltip label={`Ask ${PROFILE.assistant.name} to change this edit`}>
            <button
              type="button"
              className={cn(textButtonClass, "ps-2")}
              onClick={askForChange}
            >
              <Icon {...icons.askAi} className="text-muted-foreground" />
              Ask for change
            </button>
          </Tooltip>
          <Tooltip label={`Keep the edit (${keys.accept})`}>
            <button
              type="button"
              aria-keyshortcuts={`${keys.modifier}+Enter`}
              className={cn(primaryButtonClass, "ps-2.5")}
              onClick={accept}
            >
              <Icon {...icons.tick} />
              Accept
            </button>
          </Tooltip>
        </Pill>
      ) : null}
    </>,
    anchor,
  );
}

/**
 * The assistant's name on the caret where it is writing, as a collaborator's
 * would be. The editor mounts it inside the caret, which it moves and hides,
 * and sets `data-side` on the caret to the side the flag has room on.
 */
export function AssistantFlag() {
  return <span className="doc-flag">{PROFILE.assistant.name}</span>;
}
