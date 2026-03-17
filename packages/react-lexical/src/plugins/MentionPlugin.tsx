"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $getRoot,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  TextNode,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import {
  $createMentionNodeWithFormatter,
  $isMentionNode,
} from "../nodes/MentionNode";
import type {
  Unstable_MentionItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { unstable_useMentionInternalContext } from "@assistant-ui/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MentionPluginProps = {
  /** Callback fired after a mention is inserted. */
  onMentionSelect?: ((item: Unstable_MentionItem) => void) | undefined;
  /** Trigger character that opens the mention flow. @default "@" */
  trigger?: string | undefined;
  /** Formatter for serializing mention directives. */
  formatter?: Unstable_DirectiveFormatter | undefined;
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

/** @internal Exported for testing. */
export function findTriggerMatch(
  trigger: string,
  node: TextNode,
  anchorOffset: number,
): TriggerMatch | null {
  const text = node.getTextContent();
  const textUpToCursor = text.slice(0, anchorOffset);

  for (let i = textUpToCursor.length - 1; i >= 0; i--) {
    const char = textUpToCursor[i]!;
    if (char === " " || char === "\n") {
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
// Internal: compute cursor position as character offset into the full text
// ---------------------------------------------------------------------------

function computeCursorPosition(
  anchorNode: TextNode,
  anchorOffset: number,
): number {
  let offset = 0;

  const paragraph = anchorNode.getParent();
  if (!paragraph || !$isElementNode(paragraph)) return anchorOffset;

  const root = $getRoot();
  for (const child of root.getChildren()) {
    if (child === paragraph) break;
    if ($isElementNode(child)) {
      for (const c of child.getChildren()) {
        offset += c.getTextContent().length;
      }
    }
    offset += 1; // newline between paragraphs
  }

  for (const child of paragraph.getChildren()) {
    if (child === anchorNode) {
      offset += anchorOffset;
      break;
    }
    offset += child.getTextContent().length;
  }

  return offset;
}

// ---------------------------------------------------------------------------
// MentionPlugin component — auto-wires to MentionInternalContext
// ---------------------------------------------------------------------------

export function MentionPlugin({
  onMentionSelect,
  trigger = "@",
  formatter: formatterProp,
}: MentionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;
  const formatter = formatterProp ?? unstable_defaultDirectiveFormatter;
  const formatterRef = useRef(formatter);
  formatterRef.current = formatter;

  // Auto-wire to MentionInternalContext (optional — gracefully degrades)
  const mentionInternalContext = unstable_useMentionInternalContext();
  const setCursorPosition = mentionInternalContext?.setCursorPosition;
  const registerSelectItemOverride =
    mentionInternalContext?.registerSelectItemOverride;

  // Track the current trigger match
  const matchRef = useRef<TriggerMatch | null>(null);

  // -----------------------------------------------------------------------
  // Watch for text changes and update trigger match + cursor position
  // -----------------------------------------------------------------------

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            matchRef.current = null;
            setCursorPosition?.(0);
            return;
          }

          const anchor = selection.anchor;
          if (anchor.type !== "text") {
            matchRef.current = null;
            setCursorPosition?.(0);
            return;
          }

          const anchorNode = anchor.getNode();
          if (!$isTextNode(anchorNode)) {
            matchRef.current = null;
            setCursorPosition?.(0);
            return;
          }

          // Report cursor position to MentionContext
          const cursorPos = computeCursorPosition(anchorNode, anchor.offset);
          setCursorPosition?.(cursorPos);

          matchRef.current = findTriggerMatch(
            triggerRef.current,
            anchorNode,
            anchor.offset,
          );
        });
      }),

      // Delete the entire MentionNode on backspace
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        () => {
          const selection = $getSelection();

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

          if ($isTextNode(node) && anchor.offset === 0) {
            const prev = node.getPreviousSibling();
            if ($isMentionNode(prev)) {
              prev.remove();
              return true;
            }
          }

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
  }, [editor, setCursorPosition]);

  // -----------------------------------------------------------------------
  // Insert a mention — replaces the @query text with a MentionNode
  // -----------------------------------------------------------------------

  const insertMention = useCallback(
    (item: Unstable_MentionItem) => {
      const match = matchRef.current;
      if (!match) return;

      editor.update(() => {
        const { node, startOffset, endOffset } = match;

        if (!node.isAttached()) return;

        const mentionNode = $createMentionNodeWithFormatter(
          item,
          formatterRef.current,
        );

        if (startOffset === 0 && endOffset === node.getTextContentSize()) {
          node.replace(mentionNode);
        } else if (startOffset === 0) {
          const [leftNode, rightNode] = node.splitText(endOffset);
          if (rightNode) {
            rightNode.insertBefore(mentionNode);
          }
          // Remove the left node containing the trigger+query text
          leftNode?.remove();
        } else {
          const parts = node.splitText(startOffset, endOffset);
          const targetNode = parts[1];
          if (targetNode) {
            targetNode.replace(mentionNode);
          }
        }

        mentionNode.selectNext();
        matchRef.current = null;
      });

      onMentionSelect?.(item);
    },
    [editor, onMentionSelect],
  );

  // -----------------------------------------------------------------------
  // Register the selectItem override so the popover uses insertMention
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!registerSelectItemOverride) return undefined;

    return registerSelectItemOverride((item: Unstable_MentionItem) => {
      if (!matchRef.current) return false;
      insertMention(item);
      return true;
    });
  }, [registerSelectItemOverride, insertMention]);

  return null;
}
