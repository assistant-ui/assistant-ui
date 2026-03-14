"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $isElementNode,
} from "lexical";
import { useAui } from "@assistant-ui/store";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { $createMentionNode } from "../nodes/MentionNode";

// ---------------------------------------------------------------------------
// SyncPlugin — bidirectional sync between Lexical and ComposerRuntime
// ---------------------------------------------------------------------------

export function SyncPlugin({
  formatter,
}: {
  formatter?: Unstable_DirectiveFormatter;
}) {
  const resolvedFormatter = formatter ?? unstable_defaultDirectiveFormatter;
  const [editor] = useLexicalComposerContext();
  const aui = useAui();

  const isSyncingFromLexicalRef = useRef(false);
  const isSyncingFromRuntimeRef = useRef(false);
  const lastSyncedTextRef = useRef("");

  // -----------------------------------------------------------------------
  // Lexical -> Runtime
  // MentionNode.getTextContent() returns `:type[label]`, so the extracted
  // text naturally contains the directive syntax.
  // -----------------------------------------------------------------------

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (isSyncingFromRuntimeRef.current) return;
      if (tags.has("history-merge")) return;

      editorState.read(() => {
        isSyncingFromLexicalRef.current = true;

        try {
          const root = $getRoot();
          let fullText = "";

          for (const paragraph of root.getChildren()) {
            if (fullText.length > 0) {
              fullText += "\n";
            }
            if (!$isElementNode(paragraph)) continue;
            for (const child of paragraph.getChildren()) {
              fullText += child.getTextContent();
            }
          }

          const composer = aui.composer();

          if (fullText !== lastSyncedTextRef.current) {
            lastSyncedTextRef.current = fullText;
            composer.setText(fullText);
          }
        } finally {
          isSyncingFromLexicalRef.current = false;
        }
      });
    });
  }, [editor, aui]);

  // -----------------------------------------------------------------------
  // Runtime -> Lexical
  // Parse `:type[label]` directives and create MentionNode for each.
  // -----------------------------------------------------------------------

  useEffect(() => {
    // Subscribe via ComposerRuntime so we only react to composer state
    // changes (e.g. text updates), not all AUI state changes.
    const composerRuntime = aui.composer().__internal_getRuntime?.();
    if (!composerRuntime) return;

    return composerRuntime.subscribe(() => {
      if (isSyncingFromLexicalRef.current) return;

      const runtimeText = composerRuntime.getState().text;

      if (runtimeText === lastSyncedTextRef.current) return;

      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = runtimeText;

      editor.update(
        () => {
          const root = $getRoot();
          root.clear();

          if (runtimeText.length === 0) {
            root.append($createParagraphNode());
            root.selectEnd();
            return;
          }

          const lines = runtimeText.split("\n");
          for (const line of lines) {
            const paragraph = $createParagraphNode();
            const segments = resolvedFormatter.parse(line);

            for (const seg of segments) {
              if (seg.kind === "text") {
                if (seg.text.length > 0) {
                  paragraph.append($createTextNode(seg.text));
                }
              } else {
                paragraph.append(
                  $createMentionNode({
                    id: seg.id,
                    type: seg.type,
                    label: seg.label,
                  }),
                );
              }
            }

            root.append(paragraph);
          }

          // Restore cursor at end after rebuild
          root.selectEnd();
        },
        {
          onUpdate: () => {
            isSyncingFromRuntimeRef.current = false;
          },
        },
      );
    });
  }, [editor, aui, resolvedFormatter]);

  return null;
}
