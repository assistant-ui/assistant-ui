"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  type TextNode,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import {
  $createMentionNodeWithFormatter,
  $isMentionNode,
} from "../nodes/MentionNode";
import type {
  Unstable_DirectiveFormatter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import {
  unstable_useTriggerPopoverRootContextOptional,
  type Unstable_RegisteredTrigger,
} from "@assistant-ui/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MentionPluginProps = {
  /** Callback fired after a mention is inserted. */
  onMentionSelect?: ((item: Unstable_TriggerItem) => void) | undefined;
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
// MentionPlugin — iterates all `insertDirective` triggers from the
// TriggerPopoverRoot and wires each to Lexical MentionNode insertion.
// ---------------------------------------------------------------------------

type ActiveMatch = {
  readonly triggerId: string;
  readonly formatter: Unstable_DirectiveFormatter;
  readonly match: TriggerMatch;
};

export function MentionPlugin({ onMentionSelect }: MentionPluginProps = {}) {
  const [editor] = useLexicalComposerContext();
  const root = unstable_useTriggerPopoverRootContextOptional();

  const matchRef = useRef<ActiveMatch | null>(null);
  const triggersRef = useRef<ReadonlyMap<string, Unstable_RegisteredTrigger>>(
    root?.getTriggers() ?? new Map(),
  );

  // -----------------------------------------------------------------------
  // Watch text changes: update trigger match for whichever `insertDirective`
  // trigger (if any) matches the current caret position.
  // -----------------------------------------------------------------------

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            matchRef.current = null;
            return;
          }

          const anchor = selection.anchor;
          if (anchor.type !== "text") {
            matchRef.current = null;
            return;
          }

          const anchorNode = anchor.getNode();
          if (!$isTextNode(anchorNode)) {
            matchRef.current = null;
            return;
          }

          matchRef.current = null;
          for (const [id, trigger] of triggersRef.current) {
            if (trigger.onSelect.type !== "insertDirective") continue;
            const match = findTriggerMatch(
              trigger.char,
              anchorNode,
              anchor.offset,
            );
            if (match) {
              matchRef.current = {
                triggerId: id,
                formatter: trigger.onSelect.formatter,
                match,
              };
              break;
            }
          }
        });
      }),

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
  }, [editor]);

  // -----------------------------------------------------------------------
  // Insert a mention — replaces the @query text with a MentionNode.
  // -----------------------------------------------------------------------

  const insertMention = useCallback(
    (item: Unstable_TriggerItem, active: ActiveMatch) => {
      const { node, startOffset, endOffset } = active.match;

      editor.update(() => {
        if (!node.isAttached()) return;

        const mentionNode = $createMentionNodeWithFormatter(
          item,
          active.formatter,
        );

        if (startOffset === 0 && endOffset === node.getTextContentSize()) {
          node.replace(mentionNode);
        } else if (startOffset === 0) {
          const [leftNode, rightNode] = node.splitText(endOffset);
          if (rightNode) {
            rightNode.insertBefore(mentionNode);
          }
          leftNode?.remove();
        } else {
          const parts = node.splitText(startOffset, endOffset);
          const targetNode = parts[1];
          if (targetNode) {
            targetNode.replace(mentionNode);
          }
        }

        mentionNode.selectNext();
      });

      matchRef.current = null;
      onMentionSelect?.(item);
    },
    [editor, onMentionSelect],
  );

  // -----------------------------------------------------------------------
  // Register a selectItem override on every `insertDirective` trigger so
  // selecting an item routes to Lexical MentionNode insertion.
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!root) return undefined;
    const unsubByTrigger = new Map<string, () => void>();

    const wire = (trigger: Unstable_RegisteredTrigger) => {
      if (trigger.onSelect.type !== "insertDirective") return;
      unsubByTrigger.set(
        trigger.id,
        wireTrigger(trigger.id, trigger, matchRef, insertMention),
      );
    };

    for (const trigger of root.getTriggers().values()) wire(trigger);
    triggersRef.current = root.getTriggers();

    const unsubLifecycle = root.subscribeLifecycle({
      added: (trigger) => {
        triggersRef.current = root.getTriggers();
        wire(trigger);
      },
      removed: (id) => {
        triggersRef.current = root.getTriggers();
        unsubByTrigger.get(id)?.();
        unsubByTrigger.delete(id);
      },
    });

    return () => {
      unsubLifecycle();
      for (const u of unsubByTrigger.values()) u();
      unsubByTrigger.clear();
    };
  }, [root, insertMention]);

  return null;
}

function wireTrigger(
  id: string,
  trigger: Unstable_RegisteredTrigger,
  matchRef: React.RefObject<ActiveMatch | null>,
  insertMention: (item: Unstable_TriggerItem, active: ActiveMatch) => void,
): () => void {
  return trigger.resource.registerSelectItemOverride((item) => {
    const active = matchRef.current;
    if (!active || active.triggerId !== id) return false;
    insertMention(item, active);
    return true;
  });
}
