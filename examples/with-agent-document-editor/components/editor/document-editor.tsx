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
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { EditorThemeClasses } from "lexical";
import { useCallback, useRef, useState } from "react";
import type { BlockIds } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { CommentHighlights } from "./comment-highlights";
import { DocumentSync } from "./document-sync";
import { FormatToolbar } from "./format-toolbar";
import { SelectionToolbar } from "./selection-toolbar";
import { SlashMenu } from "./slash-menu";

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
  hr: "border-foreground/15 my-6 border-t data-[lexical-node-selection=true]:border-blue-500",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline underline-offset-4",
    strikethrough: "line-through",
    underlineStrikethrough: "[text-decoration-line:underline_line-through]",
    highlight: "bg-yellow-200/80 text-inherit dark:bg-yellow-400/30",
    code: "bg-muted rounded px-1 py-0.5 font-mono text-[0.9em]",
  },
};

const PLACEHOLDER =
  "Start writing, type / to insert a block, or ask the assistant for a first draft.";

const initialConfig: InitialConfigType = {
  namespace: "with-agent-document-editor",
  theme,
  nodes: [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    LinkNode,
    HorizontalRuleNode,
  ],
  onError: (error) => {
    throw error;
  },
};

export function DocumentEditor() {
  const [ids] = useState<BlockIds>(() => new Map());
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const caret = useRef<HTMLSpanElement>(null);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <FormatToolbar />
      <div className="min-h-0 flex-1 scroll-pt-6 scroll-pb-56 [scrollbar-gutter:stable_both-edges] overflow-y-auto">
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
          <span
            ref={caret}
            aria-hidden
            hidden
            className="pointer-events-none absolute z-10 -ms-px w-0.5 animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none dark:bg-blue-400"
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <HorizontalRulePlugin />
      <SlashMenu />
      <DocumentSync ids={ids} caret={caret} onReady={onReady} />
      <CommentHighlights ids={ids} />
      <SelectionToolbar ids={ids} />
    </LexicalComposer>
  );
}
