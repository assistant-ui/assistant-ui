"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useRef } from "react";
import { useCommentsState, useWorkspace } from "@/components/workspace-context";
import { $findBlockKey, plainText, type BlockIds } from "@/lib/blocks";
import { textOf, textRange } from "./stream-paint";

const HIGHLIGHT = "doc-comment";
const ACTIVE_HIGHLIGHT = "doc-comment-active";

const supportsHighlights = () =>
  typeof CSS !== "undefined" && "highlights" in CSS;

function findTextRange(root: HTMLElement, quote: string): Range | null {
  const text = textOf(root);
  let start = text.indexOf(quote);
  let length = quote.length;
  if (start === -1) {
    const plain = plainText(quote);
    start = text.indexOf(plain);
    length = plain.length;
  }
  if (start === -1 || length === 0) return null;
  return textRange(root, start, start + length);
}

/**
 * Marks commented passages with the CSS Custom Highlight API, so a comment
 * never changes the document itself. A comment whose passage was edited away
 * stays in the panel without a mark.
 */
export function CommentHighlights({ ids }: { ids: BlockIds }) {
  const [editor] = useLexicalComposerContext();
  const [{ comments }] = useCommentsState();
  const { activeCommentId, showComment } = useWorkspace();
  const ranges = useRef(new Map<string, Range>());

  const paint = useCallback(() => {
    const anchored = comments.filter(
      (comment) =>
        comment?.id &&
        comment.blockId &&
        comment.quote &&
        !comment.replyTo &&
        !comment.resolved,
    );
    const keys = editor
      .getEditorState()
      .read(() =>
        anchored.map((comment) => $findBlockKey(ids, comment.blockId)),
      );

    const next = new Map<string, Range>();
    anchored.forEach((comment, index) => {
      const key = keys[index];
      const element = key ? editor.getElementByKey(key) : null;
      const range = element ? findTextRange(element, comment.quote) : null;
      if (range) next.set(comment.id, range);
    });
    ranges.current = next;
    // The ranges also serve clicks and scrolling, which need no highlights.
    if (!supportsHighlights()) return;

    const active = activeCommentId ? next.get(activeCommentId) : undefined;
    const rest = [...next].flatMap(([id, range]) =>
      id === activeCommentId ? [] : [range],
    );
    CSS.highlights.set(HIGHLIGHT, new Highlight(...rest));
    if (active) CSS.highlights.set(ACTIVE_HIGHLIGHT, new Highlight(active));
    else CSS.highlights.delete(ACTIVE_HIGHLIGHT);
  }, [editor, ids, comments, activeCommentId]);

  useEffect(() => {
    paint();
    let frame = 0;
    const unregister = editor.registerUpdateListener(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });
    return () => {
      cancelAnimationFrame(frame);
      unregister();
    };
  }, [editor, paint]);

  useEffect(() => {
    return () => {
      if (!supportsHighlights()) return;
      CSS.highlights.delete(HIGHLIGHT);
      CSS.highlights.delete(ACTIVE_HIGHLIGHT);
    };
  }, []);

  useEffect(() => {
    if (!activeCommentId) return;
    const range = ranges.current.get(activeCommentId);
    range?.startContainer.parentElement?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeCommentId]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return;
      for (const [id, range] of ranges.current) {
        for (const rect of range.getClientRects()) {
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            showComment(id);
            return;
          }
        }
      }
    };
    return editor.registerRootListener((root, previousRoot) => {
      previousRoot?.removeEventListener("click", onClick);
      root?.addEventListener("click", onClick);
    });
  }, [editor, showComment]);

  return null;
}
