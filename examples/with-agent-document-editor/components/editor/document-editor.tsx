"use client";

import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  LexicalComposer,
  type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { EditorThemeClasses } from "lexical";
import { useCallback, useState } from "react";
import type { BlockIds } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { CommentHighlights } from "./comment-highlights";
import { DocumentSync } from "./document-sync";
import { FormatToolbar } from "./format-toolbar";
import { SelectionToolbar } from "./selection-toolbar";

const theme: EditorThemeClasses = {
  paragraph: "mb-4 leading-7",
  heading: {
    h1: "mt-2 mb-5 text-3xl font-semibold tracking-tight",
    h2: "mt-8 mb-3 text-xl font-semibold tracking-tight",
    h3: "mt-6 mb-2 text-base font-semibold",
  },
  quote:
    "border-foreground/15 text-muted-foreground mb-4 border-s-2 ps-4 leading-7",
  list: {
    ul: "mb-4 list-disc ps-6",
    ol: "mb-4 list-decimal ps-6",
    listitem: "leading-7",
    nested: { listitem: "list-none" },
  },
  link: "decoration-foreground/30 hover:decoration-foreground underline underline-offset-4",
  text: {
    bold: "font-semibold",
    italic: "italic",
    code: "bg-muted rounded px-1 py-0.5 font-mono text-[0.9em]",
  },
};

const PLACEHOLDER = "Start writing, or ask the assistant for a first draft.";

const initialConfig: InitialConfigType = {
  namespace: "with-agent-document-editor",
  theme,
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
  onError: (error) => {
    throw error;
  },
};

export function DocumentEditor() {
  const [ids] = useState<BlockIds>(() => new Map());
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <FormatToolbar />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable_both-edges] overflow-y-auto">
        <div
          className={cn(
            "relative mx-auto w-full max-w-2xl px-6 pt-10 pb-72 text-[15px] transition-opacity duration-150 motion-reduce:transition-none",
            !ready && "opacity-0",
          )}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label="Document"
                aria-placeholder={PLACEHOLDER}
                placeholder={
                  <p className="text-muted-foreground/70 pointer-events-none absolute top-10 leading-7">
                    {PLACEHOLDER}
                  </p>
                }
                className="outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <DocumentSync ids={ids} onReady={onReady} />
      <CommentHighlights ids={ids} />
      <SelectionToolbar ids={ids} />
    </LexicalComposer>
  );
}
