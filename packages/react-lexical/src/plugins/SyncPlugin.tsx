"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $isElementNode,
  type LexicalEditor,
} from "lexical";
import { useAui } from "@assistant-ui/store";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { $createMentionNodeWithFormatter } from "../nodes/MentionNode";

function syncRuntimeToLexical(
  editor: LexicalEditor,
  runtimeText: string,
  formatter: Unstable_DirectiveFormatter,
  onComplete: () => void,
) {
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
        const segments = formatter.parse(line);

        for (const seg of segments) {
          if (seg.kind === "text") {
            if (seg.text.length > 0) {
              paragraph.append($createTextNode(seg.text));
            }
          } else {
            paragraph.append(
              $createMentionNodeWithFormatter(
                {
                  id: seg.id,
                  type: seg.type,
                  label: seg.label,
                },
                formatter,
              ),
            );
          }
        }

        root.append(paragraph);
      }

      root.selectEnd();
    },
    { onUpdate: onComplete },
  );
}

// SyncPlugin — bidirectional sync between Lexical and ComposerRuntime
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

  useEffect(() => {
    const composerRuntime = aui.composer().__internal_getRuntime?.();
    if (!composerRuntime) return;

    // Initial sync — populate editor with any preloaded text
    const initialText = composerRuntime.getState().text;
    if (initialText && initialText !== lastSyncedTextRef.current) {
      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = initialText;
      syncRuntimeToLexical(editor, initialText, resolvedFormatter, () => {
        isSyncingFromRuntimeRef.current = false;
      });
    }

    return composerRuntime.subscribe(() => {
      if (isSyncingFromLexicalRef.current) return;

      const runtimeText = composerRuntime.getState().text;

      if (runtimeText === lastSyncedTextRef.current) return;

      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = runtimeText;
      syncRuntimeToLexical(editor, runtimeText, resolvedFormatter, () => {
        isSyncingFromRuntimeRef.current = false;
      });
    });
  }, [editor, aui, resolvedFormatter]);

  return null;
}
