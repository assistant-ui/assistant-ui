"use client";

import { useAuiState } from "@assistant-ui/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from "lexical";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useDocumentState } from "@/components/workspace-context";
import { $readBlocks, $writeBlocks, type BlockIds } from "@/lib/blocks";
import { DOCUMENT_NAME, initialDocument } from "@/lib/document-state";
import {
  advance,
  displayBlocks,
  receive,
  remaining,
  settled,
  streamMarks,
} from "@/lib/streaming";
import { createStreamPainter } from "./stream-paint";

const SYNC_TAG = "document-sync";
const UPDATE_TOOL = `update_${DOCUMENT_NAME}`;

/** Characters a second the assistant's text is typed at. */
const TYPING_SPEED = 150;
/** Seconds any amount of waiting text may take; longer edits type faster. */
const LONGEST_TYPING = 2;

const mintBlockId = () => `b-${Math.random().toString(36).slice(2, 8)}`;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Keeps the editor and the `document` interactable in step. What the user
 * types is written to the interactable. What the assistant writes there is
 * typed into the editor a block at a time (see `lib/streaming.ts`), and a
 * restored version is written as it is.
 */
export function DocumentSync({
  ids,
  caret,
  onReady,
}: {
  ids: BlockIds;
  caret: RefObject<HTMLElement | null>;
  onReady: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [document, { setState }] = useDocumentState();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const inFlight = useAuiState((s) => {
    if (!s.thread.isRunning) return false;
    const last = s.thread.messages.at(-1);
    return (
      last?.role === "assistant" &&
      last.content.some(
        (part) =>
          part.type === "tool-call" &&
          part.toolName === UPDATE_TOOL &&
          part.result === undefined,
      )
    );
  });
  const [typing, setTyping] = useState(false);

  const stream = useRef(settled([]));
  const inEditor = useRef<string | null>(null);
  const sameUndoStep = useRef(true);
  const wasRunning = useRef(isRunning);
  const frame = useRef(0);
  const [painter] = useState(() =>
    createStreamPainter(editor, ids, () => caret.current),
  );

  const show = useCallback(() => {
    const blocks = displayBlocks(stream.current);
    const paint = () => painter.paint(streamMarks(stream.current));
    const serialized = JSON.stringify(blocks);
    if (serialized === inEditor.current) {
      paint();
      return;
    }
    inEditor.current = serialized;
    editor.update(() => $writeBlocks(blocks, ids), {
      // A whole edit by the assistant is one undo step, not one per frame,
      // and the starting document is not a step at all.
      tag: [
        SYNC_TAG,
        sameUndoStep.current ? HISTORY_MERGE_TAG : HISTORY_PUSH_TAG,
        SKIP_DOM_SELECTION_TAG,
        SKIP_SCROLL_INTO_VIEW_TAG,
      ],
      onUpdate: paint,
    });
    sameUndoStep.current = true;
  }, [editor, ids, painter]);

  const type = useCallback(() => {
    if (frame.current) return;
    let last = performance.now();
    const step = (now: number) => {
      const seconds = Math.min(now - last, 100) / 1000;
      last = now;
      setTyping(true);
      const waiting = remaining(stream.current);
      if (waiting > 0) {
        const characters = prefersReducedMotion()
          ? waiting
          : Math.round(
              Math.max(TYPING_SPEED, waiting / LONGEST_TYPING) * seconds,
            );
        stream.current = advance(stream.current, Math.max(1, characters));
        show();
      }
      if (remaining(stream.current) > 0) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      frame.current = 0;
      setTyping(false);
    };
    frame.current = requestAnimationFrame(step);
  }, [show]);

  useEffect(() => {
    if (!wasRunning.current && isRunning && !stream.current.active) {
      sameUndoStep.current = false;
    }
    wasRunning.current = isRunning;
    onReady();
    stream.current = receive(stream.current, document.blocks, inFlight);
    show();
    if (remaining(stream.current) > 0) type();
  }, [document.blocks, inFlight, isRunning, onReady, show, type]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(SYNC_TAG)) return;
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        const blocks = editorState.read(() => $readBlocks(ids, mintBlockId));
        const serialized = JSON.stringify(blocks);
        if (serialized === inEditor.current) return;
        inEditor.current = serialized;
        stream.current = settled(blocks);
        sameUndoStep.current = false;
        setState((previous) => ({
          ...(previous ?? initialDocument),
          blocks,
        }));
      },
    );
  }, [editor, ids, setState]);

  useEffect(() => {
    editor.setEditable(!isRunning && !typing);
  }, [editor, isRunning, typing]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      painter.clear();
    };
  }, [painter]);

  return null;
}
