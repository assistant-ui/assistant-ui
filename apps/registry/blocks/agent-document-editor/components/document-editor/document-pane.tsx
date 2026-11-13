"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  LexicalComposer,
  type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $getRoot } from "lexical";
import { useDocument, useDocumentStore } from "@/hooks/use-document";
import { countWords } from "@/lib/document-editor/document";
import { registerDocumentSync } from "@/lib/document-editor/document-sync";
import {
  DOCUMENT_NODES,
  DOCUMENT_TRANSFORMERS,
} from "@/lib/document-editor/markdown";
import { DocumentToolbar } from "./document-toolbar";

const PLACEHOLDER = "Start writing, or ask the assistant for a first draft.";

const initialConfig: InitialConfigType = {
  namespace: "document-editor",
  nodes: DOCUMENT_NODES,
  onError: (error) => {
    throw error;
  },
  theme: {
    paragraph: "mt-4 first:mt-0",
    heading: {
      h1: "mt-8 text-2xl font-semibold tracking-tight first:mt-0",
      h2: "mt-8 text-xl font-semibold tracking-tight first:mt-0",
      h3: "mt-6 text-base font-semibold first:mt-0",
    },
    quote: "text-muted-foreground mt-4 border-s-2 ps-4 first:mt-0",
    list: {
      ul: "mt-4 list-disc ps-6 first:mt-0",
      ol: "mt-4 list-decimal ps-6 first:mt-0",
      listitem: "mt-1.5",
      nested: { listitem: "list-none" },
    },
    link: "underline underline-offset-4",
    text: {
      bold: "font-semibold",
      italic: "italic",
      strikethrough: "line-through",
      code: "bg-muted rounded-sm px-1 py-0.5 font-mono text-[0.875em]",
    },
  },
};

function DocumentSyncPlugin() {
  const [editor] = useLexicalComposerContext();
  const store = useDocumentStore();
  useEffect(() => registerDocumentSync(editor, store), [editor, store]);
  return null;
}

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

function DocumentStatus() {
  const [editor] = useLexicalComposerContext();
  const selection = useDocument((state) => state.selection);
  const subscribe = useCallback(
    (onChange: () => void) => editor.registerTextContentListener(onChange),
    [editor],
  );
  const words = useSyncExternalStore(
    subscribe,
    () =>
      countWords(
        editor.getEditorState().read(() => $getRoot().getTextContent()),
      ),
    () => 0,
  );

  return (
    <footer className="text-muted-foreground flex gap-4 px-4 py-2 text-xs tabular-nums">
      <span>{plural(words, "word")}</span>
      {selection.trim() === "" ? null : (
        <span>{plural(countWords(selection), "word")} selected</span>
      )}
    </footer>
  );
}

export function DocumentPane() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div data-slot="document-pane" className="flex h-full min-h-0 flex-col">
        <DocumentToolbar />
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label="Document"
                aria-placeholder={PLACEHOLDER}
                placeholder={
                  <p className="text-muted-foreground pointer-events-none absolute inset-x-0 top-0 mx-auto w-full max-w-3xl px-6 py-5 text-[15px] leading-7">
                    {PLACEHOLDER}
                  </p>
                }
                className="mx-auto min-h-full w-full max-w-3xl px-6 py-5 text-[15px] leading-7 outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={DOCUMENT_TRANSFORMERS} />
        <DocumentSyncPlugin />
        <DocumentStatus />
      </div>
    </LexicalComposer>
  );
}
