"use client";

import { useAuiState } from "@assistant-ui/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from "lexical";
import { useEffect, useRef } from "react";
import { useDocumentState } from "@/components/workspace-context";
import { $readBlocks, $writeBlocks, type BlockIds } from "@/lib/blocks";
import {
  DOCUMENT_NAME,
  initialDocument,
  isBlockType,
  type Block,
} from "@/lib/document-state";

const SYNC_TAG = "document-sync";
const UPDATE_TOOL = `update_${DOCUMENT_NAME}`;

const mintBlockId = () => `b-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Keeps the editor and the `document` interactable in step. What the user
 * types is written to the interactable, and what the assistant writes there,
 * or a restored version, is written into the editor.
 */
export function DocumentSync({
  ids,
  onReady,
}: {
  ids: BlockIds;
  onReady: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [document, { setState }] = useDocumentState();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const isWriting = useAuiState((s) => {
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
  const inEditor = useRef<string | null>(null);
  const shown = useRef<readonly Partial<Block>[]>([]);
  const writingContinues = useRef(true);
  const wasRunning = useRef(isRunning);

  useEffect(() => {
    if (wasRunning.current !== isRunning) {
      wasRunning.current = isRunning;
      writingContinues.current = false;
    }
    let blocks: readonly Partial<Block>[] = document.blocks;
    if (isWriting) {
      // While a call streams in, a block keeps what the page shows until the
      // new text differs from it, and blocks the call has not reached yet stay
      // on the page. Without this a replaced list would empty the document
      // and type all of it again. The exact state lands when the call ends.
      const known = new Map(
        shown.current.flatMap((block) =>
          block.id ? [[block.id, block] as const] : [],
        ),
      );
      // Strings stream in a character at a time, so the id "b1" may be the
      // start of "b10" and the type "h" the start of "h2". A block counts once
      // its type is whole, which also means its id is.
      const started = blocks.filter(
        (block) =>
          block?.text !== undefined ||
          (block?.id && known.has(block.id) && isBlockType(block.type)),
      );
      const sent = new Set(started.map((block) => block.id));
      blocks = [
        ...started.map((block) => {
          const prior = block.id ? known.get(block.id) : undefined;
          if (!prior) return block;
          const unchangedSoFar =
            block.text === undefined || !!prior.text?.startsWith(block.text);
          const type = isBlockType(block.type) ? block.type : prior.type;
          const text = unchangedSoFar ? prior.text : block.text;
          return {
            ...block,
            ...(type !== undefined && { type }),
            ...(text !== undefined && { text }),
          };
        }),
        ...shown.current.filter((block) => block.id && !sent.has(block.id)),
      ];
    }
    onReady();
    const serialized = JSON.stringify(blocks);
    if (serialized === inEditor.current) return;
    inEditor.current = serialized;
    shown.current = blocks;
    editor.update(() => $writeBlocks(blocks, ids), {
      // A streamed edit is one undo step, not one per token, and the starting
      // document is not a step at all.
      tag: [
        SYNC_TAG,
        writingContinues.current ? HISTORY_MERGE_TAG : HISTORY_PUSH_TAG,
        SKIP_DOM_SELECTION_TAG,
        SKIP_SCROLL_INTO_VIEW_TAG,
      ],
    });
    writingContinues.current = true;
  }, [editor, document.blocks, ids, isRunning, isWriting, onReady]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(SYNC_TAG)) return;
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        const blocks = editorState.read(() => $readBlocks(ids, mintBlockId));
        const serialized = JSON.stringify(blocks);
        if (serialized === inEditor.current) return;
        inEditor.current = serialized;
        shown.current = blocks;
        writingContinues.current = false;
        setState((previous) => ({
          ...(previous ?? initialDocument),
          blocks,
        }));
      },
    );
  }, [editor, ids, setState]);

  useEffect(() => {
    editor.setEditable(!isRunning);
  }, [editor, isRunning]);

  return null;
}
