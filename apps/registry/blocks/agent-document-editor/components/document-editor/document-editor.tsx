"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { DocumentStoreContext, useDocumentEditor } from "@/hooks/use-document";
import { DOCUMENT_EDITOR_SUGGESTIONS } from "@/lib/document-editor/prompts";
import { DocumentWorkspace } from "./document-workspace";

export type DocumentEditorProps = {
  /** The route that streams the assistant's replies. */
  api?: string | undefined;
  /** The Markdown the editor opens with. */
  initialContent?: string | undefined;
  className?: string | undefined;
};

export function DocumentEditor({
  api = "/api/document-editor",
  initialContent,
  className,
}: DocumentEditorProps) {
  const { store, toolkit } = useDocumentEditor(initialContent);
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({ api }),
  });
  const config = AuiConfig({
    tools: Tools({ toolkit }),
    suggestions: Suggestions(DOCUMENT_EDITOR_SUGGESTIONS),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <DocumentStoreContext.Provider value={store}>
        <DocumentWorkspace className={className} />
      </DocumentStoreContext.Provider>
    </AssistantRuntimeProvider>
  );
}
