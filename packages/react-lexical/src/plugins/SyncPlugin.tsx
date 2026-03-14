"use client";

// Side-effect import: registers scope types (composer, thread, etc.) on ScopeRegistry
import "@assistant-ui/core/store";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $isElementNode,
} from "lexical";
import { useAui } from "@assistant-ui/store";
import { $createMentionNode } from "../nodes/MentionNode";

// ---------------------------------------------------------------------------
// Directive pattern: `:type[label]`
// ---------------------------------------------------------------------------

const DIRECTIVE_RE = /:(\w+)\[([^\]]+)\]/g;

type Segment =
  | { kind: "text"; text: string }
  | { kind: "mention"; type: string; label: string };

function parseDirectives(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  DIRECTIVE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DIRECTIVE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", text: text.slice(lastIndex, match.index) });
    }
    segments.push({
      kind: "mention",
      type: match[1]!,
      label: match[2]!,
    });
    lastIndex = DIRECTIVE_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", text: text.slice(lastIndex) });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// SyncPlugin — bidirectional sync between Lexical and ComposerRuntime
// ---------------------------------------------------------------------------

export function SyncPlugin() {
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
    return aui.subscribe(() => {
      if (isSyncingFromLexicalRef.current) return;

      const runtimeText = aui.composer().getState().text;

      if (runtimeText === lastSyncedTextRef.current) return;

      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = runtimeText;

      editor.update(
        () => {
          const root = $getRoot();
          root.clear();

          if (runtimeText.length === 0) {
            root.append($createParagraphNode());
            return;
          }

          const lines = runtimeText.split("\n");
          for (const line of lines) {
            const paragraph = $createParagraphNode();
            const segments = parseDirectives(line);

            for (const seg of segments) {
              if (seg.kind === "text") {
                if (seg.text.length > 0) {
                  paragraph.append($createTextNode(seg.text));
                }
              } else {
                paragraph.append(
                  $createMentionNode({
                    id: seg.label,
                    type: seg.type,
                    label: seg.label,
                  }),
                );
              }
            }

            if (segments.length === 0) {
              // Empty line — keep the paragraph
            }

            root.append(paragraph);
          }
        },
        {
          onUpdate: () => {
            isSyncingFromRuntimeRef.current = false;
          },
        },
      );
    });
  }, [editor, aui]);

  return null;
}
