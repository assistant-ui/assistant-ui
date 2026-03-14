"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  TextNode,
  type LexicalEditor,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { $createMentionNode, $isMentionNode } from "../nodes/MentionNode";
import type { Unstable_MentionItem } from "@assistant-ui/core";

// ---------------------------------------------------------------------------
// WeakMap to associate insertMention functions with editor instances
// ---------------------------------------------------------------------------

const mentionInsertMap = new WeakMap<
  LexicalEditor,
  (item: Unstable_MentionItem) => void
>();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MentionPluginProps = {
  /** Callback fired after a mention is inserted. */
  onMentionSelect?: (item: Unstable_MentionItem) => void;
  /** Trigger character that opens the mention flow. @default "@" */
  trigger?: string;
};

// ---------------------------------------------------------------------------
// Internal: find the trigger range in the current selection
// ---------------------------------------------------------------------------

type TriggerMatch = {
  /** The text after the trigger character (the query). */
  query: string;
  /** The TextNode containing the trigger. */
  node: TextNode;
  /** Start offset of the trigger character within the TextNode. */
  startOffset: number;
  /** End offset (after query) within the TextNode. */
  endOffset: number;
};

function findTriggerMatch(
  trigger: string,
  node: TextNode,
  anchorOffset: number,
): TriggerMatch | null {
  const text = node.getTextContent();
  const textUpToCursor = text.slice(0, anchorOffset);

  // Walk backwards to find the trigger character.
  // It must be preceded by a space, newline, or be at position 0.
  for (let i = textUpToCursor.length - 1; i >= 0; i--) {
    const char = textUpToCursor[i]!;
    if (char === " " || char === "\n") {
      // No trigger found before hitting whitespace
      return null;
    }
    if (
      textUpToCursor.startsWith(trigger, i) &&
      (i === 0 ||
        textUpToCursor[i - 1] === " " ||
        textUpToCursor[i - 1] === "\n")
    ) {
      return {
        query: textUpToCursor.slice(i + trigger.length),
        node,
        startOffset: i,
        endOffset: anchorOffset,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// MentionPlugin component
// ---------------------------------------------------------------------------

/**
 * Lexical plugin that watches for a trigger character (default `@`) and
 * provides an `insertMention` helper to replace the trigger + query with a
 * `MentionNode`.
 *
 * The plugin does NOT render any UI for the mention picker -- that is left to
 * the consumer. It exposes the current trigger state so the consumer can
 * render their own popover / autocomplete.
 */
export function MentionPlugin({
  onMentionSelect,
  trigger = "@",
}: MentionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;

  // Track the current trigger match (if any) so we can replace it on insert.
  const matchRef = useRef<TriggerMatch | null>(null);
  const [, setTick] = useState(0); // force re-render when match changes

  // -----------------------------------------------------------------------
  // Watch for text changes and update trigger match
  // -----------------------------------------------------------------------

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            if (matchRef.current !== null) {
              matchRef.current = null;
              setTick((t) => t + 1);
            }
            return;
          }

          const anchor = selection.anchor;
          if (anchor.type !== "text") {
            if (matchRef.current !== null) {
              matchRef.current = null;
              setTick((t) => t + 1);
            }
            return;
          }

          const anchorNode = anchor.getNode();
          if (!$isTextNode(anchorNode)) {
            if (matchRef.current !== null) {
              matchRef.current = null;
              setTick((t) => t + 1);
            }
            return;
          }

          const match = findTriggerMatch(
            triggerRef.current,
            anchorNode,
            anchor.offset,
          );

          const prev = matchRef.current;
          if (
            match?.query !== prev?.query ||
            match?.startOffset !== prev?.startOffset
          ) {
            matchRef.current = match;
            setTick((t) => t + 1);
          }
        });
      }),

      // Delete the entire MentionNode on backspace
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        () => {
          const selection = $getSelection();

          // Case 1: MentionNode is directly selected (NodeSelection)
          if ($isNodeSelection(selection)) {
            const nodes = selection.getNodes();
            let handled = false;
            for (const node of nodes) {
              if ($isMentionNode(node)) {
                node.remove();
                handled = true;
              }
            }
            return handled;
          }

          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const anchor = selection.anchor;
          const node = anchor.getNode();

          // Case 2: cursor at offset 0 of a TextNode, previous sibling is MentionNode
          if ($isTextNode(node) && anchor.offset === 0) {
            const prev = node.getPreviousSibling();
            if ($isMentionNode(prev)) {
              prev.remove();
              return true;
            }
          }

          // Case 3: cursor at element level (e.g., paragraph), child before cursor is MentionNode
          if ($isElementNode(node)) {
            const childBefore =
              anchor.offset > 0
                ? node.getChildAtIndex(anchor.offset - 1)
                : null;
            if ($isMentionNode(childBefore)) {
              childBefore.remove();
              return true;
            }
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  // -----------------------------------------------------------------------
  // Insert a mention — replaces the @query text with a MentionNode
  // -----------------------------------------------------------------------

  const insertMention = useCallback(
    (item: Unstable_MentionItem) => {
      const match = matchRef.current;
      if (!match) return;

      editor.update(() => {
        const { node, startOffset, endOffset } = match;

        // The node might have been modified since we captured the match.
        // Re-validate that it still exists in the editor.
        if (!node.isAttached()) return;

        const mentionNode = $createMentionNode(item);

        // Split the text node around the trigger + query and insert the
        // mention node in its place.
        if (startOffset === 0 && endOffset === node.getTextContentSize()) {
          // The entire text node is the trigger — replace it
          node.replace(mentionNode);
        } else if (startOffset === 0) {
          // Trigger is at the start
          const [, rightNode] = node.splitText(endOffset);
          if (rightNode) {
            rightNode.insertBefore(mentionNode);
          } else {
            node.replace(mentionNode);
          }
        } else {
          const parts = node.splitText(startOffset, endOffset);
          const targetNode = parts[1];
          if (targetNode) {
            targetNode.replace(mentionNode);
          }
        }

        // Move the selection after the mention node. Insert a trailing space
        // so the cursor has somewhere to land.
        mentionNode.selectNext();

        matchRef.current = null;
      });

      onMentionSelect?.(item);
    },
    [editor, onMentionSelect],
  );

  // Expose insertMention via WeakMap so consumers can call it
  // from outside (e.g., from a popover selection handler).
  useEffect(() => {
    mentionInsertMap.set(editor, insertMention);
    return () => {
      mentionInsertMap.delete(editor);
    };
  }, [editor, insertMention]);

  return null;
}

// ---------------------------------------------------------------------------
// Helper to get the insert function from an editor instance
// ---------------------------------------------------------------------------

/**
 * Retrieve the `insertMention` function that the `MentionPlugin` associates
 * with the Lexical editor. Returns `undefined` if the plugin is not mounted.
 */
export function getInsertMention(
  editor: LexicalEditor,
): ((item: Unstable_MentionItem) => void) | undefined {
  return mentionInsertMap.get(editor);
}
