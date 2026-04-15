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
  $createDirectiveNodeWithFormatter,
  $isDirectiveNode,
} from "../nodes/DirectiveNode";
import type {
  Unstable_DirectiveFormatter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import {
  unstable_useTriggerPopoverRootContextOptional,
  type Unstable_RegisteredTrigger,
} from "@assistant-ui/react";

export type DirectivePluginProps = {
  onDirectiveSelect?: ((item: Unstable_TriggerItem) => void) | undefined;
};

type TriggerMatch = {
  query: string;
  node: TextNode;
  startOffset: number;
  endOffset: number;
};

const WHITESPACE_RE = /\s/u;

export function findTriggerMatch(
  trigger: string,
  node: TextNode,
  anchorOffset: number,
): TriggerMatch | null {
  const text = node.getTextContent();
  const textUpToCursor = text.slice(0, anchorOffset);

  for (let i = textUpToCursor.length - 1; i >= 0; i--) {
    const char = textUpToCursor[i]!;

    if (WHITESPACE_RE.test(char)) return null;

    if (textUpToCursor.startsWith(trigger, i)) {
      if (i > 0 && !WHITESPACE_RE.test(textUpToCursor[i - 1]!)) continue;

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

type ActiveMatch = {
  readonly char: string;
  readonly formatter: Unstable_DirectiveFormatter;
  readonly match: TriggerMatch;
};

export function DirectivePlugin({
  onDirectiveSelect,
}: DirectivePluginProps = {}) {
  const [editor] = useLexicalComposerContext();
  const root = unstable_useTriggerPopoverRootContextOptional();

  const matchRef = useRef<ActiveMatch | null>(null);
  const triggersRef = useRef<ReadonlyMap<string, Unstable_RegisteredTrigger>>(
    root?.getTriggers() ?? new Map(),
  );

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
          for (const trigger of triggersRef.current.values()) {
            if (!trigger.behavior || trigger.behavior.kind !== "directive")
              continue;
            const match = findTriggerMatch(
              trigger.char,
              anchorNode,
              anchor.offset,
            );
            if (match) {
              matchRef.current = {
                char: trigger.char,
                formatter: trigger.behavior.formatter,
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
              if ($isDirectiveNode(node)) {
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
            if ($isDirectiveNode(prev)) {
              prev.remove();
              return true;
            }
          }

          if ($isElementNode(node)) {
            const childBefore =
              anchor.offset > 0
                ? node.getChildAtIndex(anchor.offset - 1)
                : null;
            if ($isDirectiveNode(childBefore)) {
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

  const insertDirective = useCallback(
    (item: Unstable_TriggerItem, active: ActiveMatch) => {
      const { node, startOffset, endOffset } = active.match;

      editor.update(
        () => {
          if (!node.isAttached()) return;

          const directiveNode = $createDirectiveNodeWithFormatter(
            item,
            active.formatter,
          );

          if (startOffset === 0 && endOffset === node.getTextContentSize()) {
            node.replace(directiveNode);
          } else if (startOffset === 0) {
            const [leftNode, rightNode] = node.splitText(endOffset);
            if (rightNode) {
              rightNode.insertBefore(directiveNode);
            }
            leftNode?.remove();
          } else {
            const parts = node.splitText(startOffset, endOffset);
            const targetNode = parts[1];
            if (targetNode) {
              targetNode.replace(directiveNode);
            }
          }

          directiveNode.selectNext();
        },
        { tag: "history-merge" },
      );

      matchRef.current = null;
      onDirectiveSelect?.(item);
    },
    [editor, onDirectiveSelect],
  );

  useEffect(() => {
    if (!root) return undefined;
    const unsubByTrigger = new Map<string, () => void>();

    const wire = (trigger: Unstable_RegisteredTrigger) => {
      if (!trigger.behavior || trigger.behavior.kind !== "directive") return;
      unsubByTrigger.set(
        trigger.char,
        wireTrigger(trigger, matchRef, insertDirective),
      );
    };

    for (const trigger of root.getTriggers().values()) wire(trigger);
    triggersRef.current = root.getTriggers();

    const unsubLifecycle = root.subscribeLifecycle({
      added: (trigger) => {
        triggersRef.current = root.getTriggers();
        wire(trigger);
      },
      removed: (char) => {
        triggersRef.current = root.getTriggers();
        unsubByTrigger.get(char)?.();
        unsubByTrigger.delete(char);
      },
    });

    return () => {
      unsubLifecycle();
      for (const u of unsubByTrigger.values()) u();
      unsubByTrigger.clear();
    };
  }, [root, insertDirective]);

  return null;
}

function wireTrigger(
  trigger: Unstable_RegisteredTrigger,
  matchRef: React.RefObject<ActiveMatch | null>,
  insertDirective: (item: Unstable_TriggerItem, active: ActiveMatch) => void,
): () => void {
  return trigger.resource.registerSelectItemOverride((item) => {
    const active = matchRef.current;
    if (!active || active.char !== trigger.char) return false;
    insertDirective(item, active);
    return true;
  });
}
