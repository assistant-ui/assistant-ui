"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useRef } from "react";
import { useCommentsState, useWorkspace } from "@/components/workspace-context";
import { $findBlockKey, plainText, type BlockIds } from "@/lib/blocks";

const HIGHLIGHT = "doc-comment";
const ACTIVE_HIGHLIGHT = "doc-comment-active";

const supportsHighlights = () =>
  typeof CSS !== "undefined" && "highlights" in CSS;

export function findTextRange(root: HTMLElement, quote: string): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
    text += (node as Text).data;
  }

  let start = text.indexOf(quote);
  let length = quote.length;
  if (start === -1) {
    const plain = plainText(quote);
    start = text.indexOf(plain);
    length = plain.length;
  }
  if (start === -1 || length === 0) return null;

  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (const node of nodes) {
    const end = offset + node.data.length;
    if (!started && start < end) {
      range.setStart(node, start - offset);
      started = true;
    }
    if (started && start + length <= end) {
      range.setEnd(node, start + length - offset);
      return range;
    }
    offset = end;
  }
  return null;
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
    if (!supportsHighlights()) return;
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
