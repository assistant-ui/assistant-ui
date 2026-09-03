"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  CloudFileAttachmentAdapter,
  Suggestions,
  Tools,
  unstable_Interactables,
  useAui,
} from "@assistant-ui/react";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { feedbackAdapter } from "@/lib/feedback-adapter";
import docsToolkit from "@/lib/docs-toolkit";
import {
  followUpSuggestionAdapter,
  useAnonymousCloud,
  useDocsChatRuntime,
  useSpeechAdapters,
} from "./chat-runtime";

const DOCS_SUGGESTIONS = [
  {
    title: "What's the weather",
    label: "in San Francisco?",
    prompt: "What's the weather in San Francisco?",
  },
  {
    title: "Explain React hooks",
    label: "like useState and useEffect",
    prompt: "Explain React hooks like useState and useEffect",
  },
  {
    title: "Show a live dashboard",
    label: "with the present tool",
    prompt:
      "Use the present tool to show a compact sales dashboard: a Card with two Facts in a Row and a bar Chart of monthly sales.",
  },
];

export function DocsRuntimeProvider({
  children,
  devtools = true,
  followUps = false,
}: {
  children: ReactNode;
  devtools?: boolean;
  followUps?: boolean;
}) {
  const cloud = useAnonymousCloud();
  const speech = useSpeechAdapters({ dictation: true });

  const adapters = useMemo(
    () => ({
      ...speech,
      feedback: feedbackAdapter,
      attachments: new CloudFileAttachmentAdapter(cloud),
      ...(followUps ? { suggestion: followUpSuggestionAdapter } : {}),
    }),
    [cloud, followUps, speech],
  );

  const runtime = useDocsChatRuntime({
    cloud,
    adapters,
    sendAutomatically: true,
    searchDocs: followUps,
  });

  const aui = useAui({
    tools: Tools({ toolkit: docsToolkit }),
    unstable_interactables: unstable_Interactables(),
    suggestions: Suggestions(DOCS_SUGGESTIONS),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}

      {devtools ? <DevToolsModal /> : null}
    </AssistantRuntimeProvider>
  );
}
