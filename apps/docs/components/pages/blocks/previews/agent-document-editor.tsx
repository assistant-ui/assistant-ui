"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  useAssistantInstructions,
} from "@assistant-ui/react";
import { DocumentWorkspace } from "@/components/document-editor/document-workspace";
import { DocumentStoreContext, useDocumentEditor } from "@/hooks/use-document";
import {
  DOCUMENT_EDITOR_INSTRUCTIONS,
  DOCUMENT_EDITOR_SUGGESTIONS,
} from "@/lib/document-editor/prompts";
import { useDocsChatRuntime } from "@/runtimes/chat-runtime";

const INITIAL_CONTENT = `# Onboarding redesign brief

## Problem

New workspaces take a long time to reach their first shared project. In the last quarter the median was **six days**, and about a third of the teams that signed up never got there at all. Support hears the same two questions over and over again: how to invite teammates, and where imported files end up.

## Goals

- Cut the median time to a first shared project from six days to two.
- Make inviting teammates part of setup instead of a settings page.
- Show imported files in the project they belong to as soon as the import finishes.

## Scope

The work covers the signup flow, the empty workspace, and the import screen. Billing, permissions, and the mobile apps are *out of scope* for this round.

## Open questions

1. Should the invite step be skippable?
2. Who owns the import screen after launch?
`;

function Instructions() {
  useAssistantInstructions(DOCUMENT_EDITOR_INSTRUCTIONS);
  return null;
}

export function AgentDocumentEditorPreview() {
  const { store, toolkit } = useDocumentEditor(INITIAL_CONTENT);
  const runtime = useDocsChatRuntime({ sendAutomatically: true });
  const config = AuiConfig({
    tools: Tools({ toolkit }),
    suggestions: Suggestions(DOCUMENT_EDITOR_SUGGESTIONS),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Instructions />
      <DocumentStoreContext.Provider value={store}>
        <DocumentWorkspace />
      </DocumentStoreContext.Provider>
    </AssistantRuntimeProvider>
  );
}
